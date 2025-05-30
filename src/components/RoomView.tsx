import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { MessageSquare, Users, Trophy, BookOpen, Video, BrainCircuit, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import StudyTimer from './StudyTimer';
import Chat from './Chat';
import RoomMembers from './RoomMembers';
import Leaderboard from './Leaderboard';
import VideoPlayer from './VideoPlayer';
import AICoach from './AICoach';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface RoomViewProps {
  session: Session;
  roomId: string;
  onLeaveRoom: () => void;
}

interface RoomUser {
  user_id: string;
  user_email: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface RoomData {
  owner_id: string;
  name: string;
  room_type: 'study' | 'watch';
  video_url?: string;
}

export default function RoomView({ session, roomId, onLeaveRoom }: RoomViewProps) {
  const { theme } = useTheme();
  const { setCurrentRoomId } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [roomType, setRoomType] = useState<'study' | 'watch'>('study');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const [manualLeave, setManualLeave] = useState(false);
  const [isPro, setIsPro] = useState(false);

  // Sohbet açıldığında sayfayı mesaj yazma alanı görünecek kadar kaydır
  useEffect(() => {
    if (showChat) {
      const scrollAmount = window.innerHeight * 0.3; // Ekran yüksekliğinin %30'u kadar kaydır
      window.scrollTo({
        top: window.scrollY + scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [showChat]);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      setIsLoading(true);
      try {
      // Check if user is room owner
      const { data: roomData } = await supabase
        .from('rooms')
        .select('owner_id, name, room_type, video_url')
        .eq('id', roomId)
        .single();

      if (roomData) {
        setIsOwner(roomData.owner_id === session.user.id);
        setRoomName(roomData.name || 'Oda');
        setRoomType(roomData.room_type || 'study');
        if (roomData.video_url) {
          setVideoUrl(roomData.video_url);
        }

          // Odaya otomatik katıl
          const { data: existingMembership } = await supabase
            .from('room_users')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!existingMembership) {
            await supabase
              .from('room_users')
              .insert([
                {
                  room_id: roomId,
                  user_id: session.user.id
                }
              ]);
          }
        } else {
          // Oda bulunamadıysa ana sayfaya dön
          onLeaveRoom();
          return;
      }

      // Fetch room users
      const { data: roomUsersData, error: roomUsersError } = await supabase
        .from('room_users')
        .select('user_id')
        .eq('room_id', roomId);

      if (roomUsersError) {
        console.error('Error fetching room users:', roomUsersError);
        setIsLoading(false);
        return;
      }

      if (!roomUsersData?.length) {
        setRoomUsers([]);
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .rpc('get_user_emails', {
          user_ids: roomUsersData.map(u => u.user_id)
        });

      if (userError) {
        console.error('Error fetching user data:', userError);
        setIsLoading(false);
        return;
      }

      // Kullanıcıların profil fotoğraflarını getir
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', roomUsersData.map(u => u.user_id));

      // Kullanıcıların isim-soyisim bilgilerini getir
      const { data: namesData } = await supabase
        .from('users_fullname')
        .select('id, first_name, last_name')
        .in('id', roomUsersData.map(u => u.user_id));

      // Sort users so owner is always first
      const users = roomUsersData.map(roomUser => {
        const user = userData?.find((u: { id: string }) => u.id === roomUser.user_id);
        const profile = profilesData?.find(p => p.id === roomUser.user_id);
        const nameInfo = namesData?.find(n => n.id === roomUser.user_id);
        
        return {
          user_id: roomUser.user_id,
          user_email: user?.email || 'Unknown User',
          avatar_url: profile?.avatar_url || null,
          first_name: nameInfo?.first_name || null,
          last_name: nameInfo?.last_name || null
        };
      }).sort((a, b) => {
        if (a.user_id === roomData?.owner_id) return -1;
        if (b.user_id === roomData?.owner_id) return 1;
        return 0;
      });

      setRoomUsers(users);
      setIsLoading(false);
      } catch (error) {
        console.error('Error fetching room details:', error);
        onLeaveRoom();
      }
    };

    fetchRoomDetails();

    // Oda kullanıcılarındaki değişiklikleri dinle
    const channel = supabase
      .channel(`room_users:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_users',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (payload.old && 'user_id' in payload.old) {
            const deletedUserId = payload.old.user_id;
            // Eğer silinen kullanıcı kendisiyse odadan çık
            if (deletedUserId === session.user.id) {
              onLeaveRoom();
              return;
            }
            // Diğer kullanıcılar için listeyi güncelle
            setRoomUsers(current => 
              current.filter(user => user.user_id !== deletedUserId)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_users',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          // Yeni kullanıcı eklendiğinde tüm listeyi güncelle
          fetchRoomDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_users',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          // Kullanıcı bilgileri güncellendiğinde tüm listeyi güncelle
          fetchRoomDetails();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      // Cleanup function: Sadece manuel leave veya atılma durumunda çıkış yapar
      // Sayfa değiştirmede otomatik çıkış yapmaz
    };
  }, [roomId, session.user.id, onLeaveRoom]);

  useEffect(() => {
    checkProStatus();
  }, [session]);

  const checkProStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('is_pro')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setIsPro(data?.is_pro || false);
    } catch (error) {
      console.error('Pro durumu kontrol edilirken hata:', error);
    }
  };

  const handleKickUser = async (userId: string) => {
    if (!isOwner) return;

    try {
      // Kullanıcıyı room_users tablosundan sil (App.tsx'teki odadan çıkma mantığı ile aynı)
      const { error: kickError } = await supabase
        .from('room_users')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (kickError) throw kickError;

      toast.success('Kullanıcı odadan atıldı.');
      setRoomUsers(current => current.filter(user => user.user_id !== userId));
      if (userId === session.user.id) {
        setCurrentRoomId(null);
      }
    } catch (error) {
      console.error('Error kicking user:', error);
      toast.error('Kullanıcı atılırken bir hata oluştu.');
    }
  };

  // Manuel odadan ayrılma fonksiyonu
  const handleManualLeaveRoom = async () => {
    setManualLeave(true);
    try {
      const { error } = await supabase
        .from('room_users')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      setCurrentRoomId(null);
      onLeaveRoom();
      toast.success('Odadan ayrıldınız.');
    } catch (error) {
      console.error('Error leaving room manually:', error);
      toast.error('Odadan ayrılırken bir hata oluştu.');
    }
  };

  // Yeni mesajları takip et
  useEffect(() => {
    if (!showChat) {
      const channel = supabase
        .channel('new_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`
          },
          (payload) => {
            const newMessage = payload.new as any;
            if (newMessage.user_id !== session.user.id) {
              setHasNewMessages(true);
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [roomId, session.user.id, showChat]);

  // Sohbet açıldığında bildirimi sıfırla
  useEffect(() => {
    if (showChat) {
      setHasNewMessages(false);
    }
  }, [showChat]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Oda Başlığı ve Kullanıcı Sayısı */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className={`flex items-center justify-center w-20 h-20 rounded-full shadow-lg mb-4 ${
          roomType === 'study' ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-orange-500 to-pink-500'
        }`}>
            {roomType === 'study' ? (
            <BookOpen className="w-10 h-10 text-white" />
            ) : (
            <Video className="w-10 h-10 text-white" />
            )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
          {roomName}
        </h1>
        <p className="text-base text-gray-300 text-center font-medium">
          {roomUsers.length} kullanıcı ile aktif {roomType === 'study' ? 'çalışma' : 'izleme'} odası
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleManualLeaveRoom}
          className="mt-4 px-5 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-red-500/30 transition-all duration-200"
        >
          Odadan Ayrıl
        </motion.button>
      </div>

      {roomType === 'study' ? (
        <>
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMembers(!showMembers)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-purple-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Oda Üyeleri
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowLeaderboard(!showLeaderboard);
                setShowChat(false);
                setShowAICoach(false);
              }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded-xl text-white font-semibold shadow-lg hover:shadow-orange-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              {showLeaderboard ? 'Kronometreleri Göster' : 'Liderlik Tablosu'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowChat(!showChat);
                setShowLeaderboard(false);
                setShowAICoach(false);
              }}
              className="relative px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              {showChat ? 'Kronometreleri Göster' : 'Sohbeti Aç'}
              {hasNewMessages && !showChat && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              )}
            </motion.button>
            <div className="relative group">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!isPro) {
                    toast.error('Bu özellik sadece Pro kullanıcılar içindir');
                    return;
                  }
                  setShowAICoach(!showAICoach);
                  setShowChat(false);
                  setShowLeaderboard(false);
                }}
                className={`px-4 py-2 ${
                  isPro
                    ? 'bg-violet-600 hover:bg-violet-500'
                    : 'bg-violet-600/50 cursor-not-allowed'
                } rounded-xl text-white font-semibold shadow-lg hover:shadow-violet-500/30 transition-all duration-200 flex items-center gap-2`}
              >
                <BrainCircuit className="w-5 h-5" />
                Eğitim Koçu
              </motion.button>
              {!isPro && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  Pro özelliği ile açılır
                </div>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {showMembers && (
              <RoomMembers
                users={roomUsers}
                isOwner={isOwner}
                onKickUser={handleKickUser}
                onClose={() => setShowMembers(false)}
              />
            )}
          </AnimatePresence>

          {showLeaderboard && <Leaderboard roomId={roomId} />}

          <div className={showChat || showLeaderboard || showAICoach ? 'hidden' : ''}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roomUsers.map((user) => (
                <StudyTimer
                  key={user.user_id}
                  userId={user.user_id}
                  userEmail={user.user_email}
                  roomId={roomId}
                  isCurrentUser={user.user_id === session.user.id}
                  avatar_url={user.avatar_url}
                  first_name={user.first_name}
                  last_name={user.last_name}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {showChat && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    mass: 0.8
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: 50, 
                  scale: 0.9,
                  transition: {
                    duration: 0.2,
                    ease: "easeInOut"
                  }
                }}
                className="mt-6"
              >
                <Chat session={session} roomId={roomId} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {showAICoach && (
              <AICoach 
                session={session}
                onClose={() => setShowAICoach(false)}
              />
            )}
          </AnimatePresence>
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMembers(!showMembers)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-purple-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Oda Üyeleri
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {showMembers && (
              <RoomMembers
                users={roomUsers}
                isOwner={isOwner}
                onKickUser={handleKickUser}
                onClose={() => setShowMembers(false)}
              />
            )}
          </AnimatePresence>

          {videoUrl && (
            <VideoPlayer session={session} roomId={roomId} videoUrl={videoUrl} />
          )}
          
          {!videoUrl && (
            <div className="p-8 text-center">
              <div className="animate-pulse mb-4 mx-auto w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Video className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Video bulunamadı
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Bu izleme odasında henüz bir video URL'si bulunamadı.
                {isOwner && " Oda ayarlarından bir video URL'si ekleyebilirsiniz."}
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {showChat && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    mass: 0.8
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: 50, 
                  scale: 0.9,
                  transition: {
                    duration: 0.2,
                    ease: "easeInOut"
                  }
                }}
                className="mt-6"
              >
                <Chat session={session} roomId={roomId} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}