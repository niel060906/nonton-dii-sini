import React, { useState, useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  increment,
  onSnapshot
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Play, X, Menu, ChevronLeft, Bell,
  AlertTriangle, Instagram, Heart, Eye, Send, Sun, Moon
} from 'lucide-react';

// --- GLOBAL STATE ---
const useStore = create(
  persist(
    (set) => ({
      favorites: [],
      theme: 'dark', 
      setTheme: (theme) => set({ theme }),
      toggleFavorite: (movie) => set((state) => {
        const isFav = state.favorites.find(f => f.id === movie.id);
        return {
          favorites: isFav 
            ? state.favorites.filter(f => f.id !== movie.id)
            : [...state.favorites, movie]
        };
      }),
    }),
    { name: 'nexstream-v10-final' }
  )
);

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyChJUtOEnYGW9iryHYqst2ql-oNDdJyysw",
  authDomain: "marketplace-ea770.firebaseapp.com",
  projectId: "marketplace-ea770",
  storageBucket: "marketplace-ea770.firebasestorage.app",
  messagingSenderId: "457308432728",
  appId: "1:457308432728:web:01568ae63de26444105d2d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- COMPONENT: PROGRESSIVE IMAGE ---
const ProgressiveImage = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div 
        className={`absolute inset-0 bg-white/5 transition-opacity duration-1000 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(40px)' }}
      />
      <img 
        src={src} 
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`h-full w-full object-cover transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
      />
    </div>
  );
};

const MovieCard = ({ movie, onPlay, toggleFavorite, isFavorite }) => {
  const [isPreviewing, setIsPreviewing] = useState(false);

  return (
    <div className="group relative">
      <div 
        onClick={() => onPlay(movie)}
        onMouseEnter={() => setIsPreviewing(true)}
        onMouseLeave={() => setIsPreviewing(false)}
        className={`relative aspect-[2/3] rounded-[2.5rem] overflow-hidden border transition-all duration-500 cursor-pointer ${isPreviewing ? 'scale-105 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)]' : 'border-white/5 bg-white/5'}`}
      >
        <ProgressiveImage 
          src={movie.thumbnail} 
          alt={movie.title} 
          className={`h-full w-full transition-opacity duration-500 ${isPreviewing ? 'opacity-30' : 'opacity-100'}`}
        />
        
        {isPreviewing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none animate-in fade-in zoom-in duration-300">
             <div className="bg-red-600 p-4 rounded-full shadow-xl shadow-red-600/40 mb-3">
                <Play className="h-6 w-6 text-white fill-white" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Tonton Sekarang</p>
          </div>
        )}

        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1 text-[9px] font-black rounded-xl border border-white/10 flex items-center gap-1.5 pointer-events-none">
           <Eye className="h-3 w-3 text-red-600" /> {movie.views || 0}
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3 px-1">
        <div onClick={() => onPlay(movie)} className="flex-1 cursor-pointer overflow-hidden">
          <h3 className="font-black text-[13px] uppercase tracking-tight truncate group-hover:text-red-600 transition-colors">{movie.title}</h3>
          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1 italic">NexStream Original</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(movie); }} className="p-1 text-gray-500 hover:text-red-600 z-10">
          <Heart className={`h-4 w-4 transition-all ${isFavorite ? 'fill-red-600 text-red-600 scale-125' : ''}`} />
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const { favorites, toggleFavorite, theme, setTheme } = useStore();
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [heroMovies, setHeroMovies] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [hasNewNotif, setHasNewNotif] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [toast, setToast] = useState(null);

  const currentThemeStyles = theme === 'red-night' ? 'bg-[#0a0000]' : 'bg-[#040404]';

  // 1. Loading Percentage Logic
  useEffect(() => {
    let interval;
    if (initialLoading) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setInitialLoading(false), 800);
            return 100;
          }
          return prev + Math.floor(Math.random() * 10) + 5;
        });
      }, 40);
    }
    return () => clearInterval(interval);
  }, [initialLoading]);

  // 2. Banner Auto-Slide (Setiap 3 Detik)
  useEffect(() => {
    if (heroMovies.length > 1 && !searchTerm) {
      const slideInterval = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % heroMovies.length);
      }, 3000);
      return () => clearInterval(slideInterval);
    }
  }, [heroMovies, searchTerm]);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return () => unsubAuth();
  }, []);

  // 3. Real-time Firebase Sync
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'), limit(30));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const movieData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !initialLoading) {
          const newDoc = change.doc.data();
          setToast({ title: newDoc.title });
          setHasNewNotif(true);
          setNotifications(prev => [{ id: change.doc.id, title: newDoc.title, time: new Date() }, ...prev]);
          setTimeout(() => setToast(null), 5000);
        }
      });

      setMovies(movieData);
      setHeroMovies(movieData.slice(0, 5)); // Slide mengambil 5 film terbaru
    });

    return () => unsubscribe();
  }, [user, initialLoading]);

  const handlePlay = async (movie) => {
    setSelectedMovie(movie);
    try {
      await updateDoc(doc(db, 'movies', movie.id), { views: increment(1) });
    } catch (e) { console.error(e); }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return movies;
    return movies.filter(m => m.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [movies, searchTerm]);

  return (
    <div className={`min-h-screen ${currentThemeStyles} text-white font-sans transition-colors duration-700 overflow-x-hidden selection:bg-red-600`}>
      <style>{`
        @font-face { font-family: 'JetBrains Mono'; src: url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&display=swap'); }
        .font-mono-custom { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 10px; }
        .animate-ring { animation: ring 2s ease infinite; }
        @keyframes ring { 0% { transform: rotate(0); } 10% { transform: rotate(15deg); } 20% { transform: rotate(-15deg); } 30% { transform: rotate(0); } }
      `}</style>

      {/* --- REAL-TIME TOAST --- */}
      {toast && (
        <div className="fixed bottom-10 left-10 z-[1001] animate-in slide-in-from-left-10 duration-500">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/10 p-5 rounded-[2rem] flex items-center gap-5 shadow-2xl">
             <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center animate-bounce">
                <Bell className="text-white h-5 w-5" />
             </div>
             <div>
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">New Upload</p>
                <h4 className="text-[11px] font-black uppercase tracking-tight">{toast.title}</h4>
             </div>
          </div>
        </div>
      )}

      {/* --- ULTRA-TRANSPARENT LOADING SCREEN --- */}
      <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${initialLoading ? 'opacity-100' : 'opacity-0 invisible scale-110 pointer-events-none'}`}>
         {/* Background transparan agar banner di belakang sudah terlihat samar */}
         <div className="absolute inset-0 bg-black/5 backdrop-blur-[40px] backdrop-saturate-150" />
         
         <div className="relative flex flex-col items-center">
            <div className="mb-8 relative scale-150 opacity-20">
               <Play className="fill-red-600 text-red-600 h-16 w-16" />
            </div>
            <div className="flex flex-col items-center gap-2">
               <span className="text-[12rem] font-black font-mono-custom leading-none tracking-tighter opacity-10 blur-[2px]">
                 {progress < 10 ? `0${progress}` : progress}
               </span>
               <div className="w-64 h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-300 ease-out shadow-[0_0_20px_#dc2626]" style={{ width: `${progress}%` }} />
               </div>
               <p className="text-[9px] font-black tracking-[1em] uppercase text-red-600 mt-6 animate-pulse ml-[1em]">Establishing Link</p>
            </div>
         </div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 z-[100] w-full bg-black/5 backdrop-blur-3xl py-5 border-b border-white/[0.03] px-6">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-black text-red-600 tracking-tighter cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <Play className="fill-red-600 h-7 w-7" />
            <span>NEXSTREAM</span>
          </div>
          <div className="flex items-center gap-3">
             {/* Notification */}
             <div className="relative">
                <button onClick={() => { setShowNotifPanel(!showNotifPanel); setHasNewNotif(false); }} className={`p-3 rounded-xl border border-white/5 bg-white/5 transition-all ${hasNewNotif ? 'text-red-600 animate-ring' : 'text-gray-400'}`}>
                  <Bell className="h-5 w-5" />
                  {hasNewNotif && <div className="absolute top-2 right-2 h-2 w-2 bg-red-600 rounded-full border border-black" />}
                </button>
                {showNotifPanel && (
                  <div className="absolute top-full right-0 mt-4 w-72 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 block mb-4">Aktivitas Terbaru</span>
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                      {notifications.map(n => (
                        <div key={n.id} className="p-3 bg-white/5 rounded-2xl border border-white/5">
                           <p className="text-[11px] font-bold uppercase truncate">{n.title}</p>
                           <p className="text-[8px] opacity-40 mt-1 uppercase font-black">Baru saja diunggah</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>

             <button onClick={() => setTheme(theme === 'dark' ? 'red-night' : 'dark')} className={`p-3 rounded-xl border border-white/5 transition-all ${theme === 'red-night' ? 'bg-red-600 text-white' : 'bg-white/5 text-red-600'}`}>
               {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
             </button>
             <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white/5 rounded-xl border border-white/10"><Menu className="h-5 w-5" /></button>
          </div>
        </div>
      </nav>

      {/* Infinite Hero Banner (Slide 3s) */}
      {!searchTerm && heroMovies.length > 0 && (
        <section className="relative w-full aspect-square md:aspect-video lg:aspect-[21/9] max-h-[65vh] overflow-hidden pt-20">
          {heroMovies.map((movie, index) => (
            <div key={movie.id} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
              <div className="absolute inset-0">
                <ProgressiveImage src={movie.thumbnail} alt={movie.title} className="w-full h-full opacity-60 saturate-[1.1]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
              </div>
              <div className="relative h-full flex flex-col justify-end pb-12 px-6 md:px-20 max-w-[1400px] mx-auto">
                <div className="max-w-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-700">
                  <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none uppercase italic">{movie.title}</h1>
                  <button onClick={() => handlePlay(movie)} className="bg-red-600 text-white px-12 py-4 rounded-xl font-black flex items-center gap-3 hover:bg-white hover:text-black transition-all uppercase text-[11px] tracking-[0.3em] shadow-[0_0_40px_rgba(220,38,38,0.4)]">
                    <Play className="fill-current h-4 w-4" /> Mulai Tonton
                  </button>
                </div>
              </div>
            </div>
          ))}
          {/* Indicators */}
          <div className="absolute bottom-10 right-10 flex gap-1.5">
             {heroMovies.map((_, i) => (
               <div key={i} className={`h-1 rounded-full transition-all duration-500 ${activeSlide === i ? 'w-10 bg-red-600' : 'w-2 bg-white/20'}`} />
             ))}
          </div>
        </section>
      )}

      {/* Content Grid */}
      <main className="max-w-[1400px] mx-auto px-6 py-20">
        <div className="flex items-center justify-between mb-16">
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3 uppercase italic">
               <div className="w-1.5 h-8 bg-red-600 rounded-full shadow-[0_0_15px_#dc2626]" />
               Koleksi Film
          </h2>
          <div className="relative flex-1 max-w-xs ml-auto">
             <input type="text" placeholder="CARI FILM..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-3 px-10 text-[10px] font-black outline-none focus:border-red-600 transition-all uppercase tracking-widest"/>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-16">
          {filtered.map(movie => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              onPlay={handlePlay} 
              toggleFavorite={toggleFavorite}
              isFavorite={favorites.find(f => f.id === movie.id)}
            />
          ))}
        </div>
      </main>

      {/* Sidebar Glass */}
      <div className={`fixed inset-0 z-[150] transition-all duration-700 flex justify-end ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-700 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSidebarOpen(false)} />
        <div className={`relative h-full w-full max-w-xs bg-white/[0.01] backdrop-blur-[50px] p-10 border-l border-white/[0.05] transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between mb-12">
             <span className="font-black text-red-600 text-lg uppercase italic">NexStream</span>
             <button onClick={() => setIsSidebarOpen(false)} className="p-3 bg-white/5 rounded-xl"><X className="h-5 w-5"/></button>
          </div>
          <div className="space-y-10">
             <div className="flex flex-col gap-3">
                <a href="https://www.instagram.com/tianshirrr_?" target="_blank" className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/[0.03] hover:bg-red-600/10 transition-all font-black uppercase text-[10px]">
                   Instagram <Instagram className="h-4 w-4 text-red-600"/>
                </a>
                <a href="https://t.me/cumayy6" target="_blank" className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/[0.03] hover:bg-red-600/10 transition-all font-black uppercase text-[10px]">
                   Lapor Bug <AlertTriangle className="h-4 w-4 text-red-600"/>
                </a>
             </div>
             <div>
                <span className="text-[9px] text-gray-600 tracking-[0.4em] uppercase font-black mb-6 block">Favorit ({favorites.length})</span>
                <div className="flex flex-col gap-5">
                  {favorites.map(fav => (
                    <div key={fav.id} onClick={() => { handlePlay(fav); setIsSidebarOpen(false); }} className="flex items-center gap-4 cursor-pointer group">
                      <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 group-hover:border-red-600 transition-all">
                        <img src={fav.thumbnail} className="h-full w-full object-cover" />
                      </div>
                      <span className="text-sm truncate group-hover:text-red-600 uppercase font-black tracking-tighter italic">{fav.title}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 1:1 Final Player */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setSelectedMovie(null)} className="px-6 py-4 bg-white/5 rounded-xl text-[10px] font-black uppercase flex items-center gap-3 hover:bg-white hover:text-black transition-all">
                <ChevronLeft className="h-4 w-4"/> Back
              </button>
              <button onClick={() => toggleFavorite(selectedMovie)} className={`p-4 rounded-xl transition-all ${favorites.find(f => f.id === selectedMovie.id) ? 'bg-red-600 text-white' : 'bg-white/5'}`}>
                <Heart className={`h-5 w-5 ${favorites.find(f => f.id === selectedMovie.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
            <div className="relative w-full aspect-square bg-black rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_150px_rgba(220,38,38,0.25)]">
               <iframe src={`https://drive.google.com/file/d/${selectedMovie.driveId || selectedMovie.videoUrl?.split('id=')[1]}/preview`} className="w-full h-full border-0" allowFullScreen />
            </div>
            <div className="mt-8 text-center">
               <h3 className="text-4xl font-black uppercase tracking-tighter italic">{selectedMovie.title}</h3>
               <p className="mt-2 text-[9px] text-red-600 font-black tracking-[1em] uppercase opacity-40">Enjoy the Stream</p>
            </div>
          </div>
        </div>
      )}

      <footer className="py-20 text-center opacity-5">
        <p className="text-[9px] font-black uppercase tracking-[2em]">NEXSTREAM V10 FINAL</p>
      </footer>
    </div>
  );
};

export default App;