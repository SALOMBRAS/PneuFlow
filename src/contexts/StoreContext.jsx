import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storageService } from '../services/storage';
import { supabase } from '../lib/supabase';

const StoreContext = createContext(null);

export function StoreProvider({ children, supabaseClient = supabase }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [member, setMember] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequestRef = useRef(0);
  const hasLoadedStoreRef = useRef(false);

  const loadStoreData = useCallback(async (currentSession, options = {}) => {
    const requestId = ++fetchRequestRef.current;
    const silent = options.silent === true;
    
    // If no session provided, try to get it
    let activeSession = currentSession;
    if (!activeSession) {
      const { data } = await supabaseClient.auth.getSession();
      activeSession = data.session;
    }

    if (!activeSession) {
      if (requestId === fetchRequestRef.current) {
        setSession(null);
        setUser(null);
        setStore(null);
        setMember(null);
        setRole(null);
        setError(null);
        hasLoadedStoreRef.current = false;
        setLoading(false);
      }
      return;
    }

    const currentUser = activeSession.user;
    
    if (requestId === fetchRequestRef.current) {
      setSession(activeSession);
      setUser(currentUser);
      if (!silent) {
        setLoading(true); // Ensure loading is true while fetching store data
      }
      setError(null);
    }

    try {
      let finalStore = null;
      let finalRole = null;
      let finalMember = null;

      // 1. Try owner_id lookup
      const ownerStore = await storageService.getStoreByOwner(currentUser.id);
      
      if (ownerStore) {
        finalStore = ownerStore;
        finalRole = 'owner';
        finalMember = null;
      } else {
        // 2. Fallback: Try store_members lookup
        const memberStore = await storageService.getStoreByMember(currentUser.id);
        if (memberStore) {
          finalStore = memberStore;
          const memberData = await storageService.getStoreMemberRole(memberStore.id, currentUser.id);
          
          if (memberData && memberData.status === 'active') {
            finalMember = memberData;
            finalRole = memberData.role || 'seller';
          } else if (memberData && memberData.status !== 'active') {
            throw new Error('Sua conta de vendedor está inativa ou pendente.');
          } else {
            throw new Error('Vínculo com a loja não encontrado.');
          }
        } else {
          const isInvitedUser = currentUser.user_metadata?.invited_to_store;
          const provisionedStore = isInvitedUser ? null : await storageService.completeRegistration();

          if (provisionedStore) {
            finalStore = provisionedStore;
            finalRole = 'owner';
            finalMember = null;
          } else {
            throw new Error('Loja ou permissão não encontrada');
          }
        }
      }

      if (requestId === fetchRequestRef.current) {
        setStore(finalStore);
        setRole(finalRole);
        setMember(finalMember);
        setError(null);
        hasLoadedStoreRef.current = true;
      }
    } catch (err) {
      console.error('[StoreContext] Error loading store data:', err);
      if (requestId === fetchRequestRef.current) {
        if (!silent || !hasLoadedStoreRef.current) {
          setError(err.message || 'Erro ao carregar dados da loja');
          setStore(null);
          setRole(null);
          setMember(null);
          hasLoadedStoreRef.current = false;
        }
      }
    } finally {
      if (requestId === fetchRequestRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [supabaseClient]);

  useEffect(() => {
    // Initial load
    loadStoreData();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN') {
        loadStoreData(newSession, { silent: hasLoadedStoreRef.current });
      } else if (event === 'TOKEN_REFRESHED') {
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          loadStoreData(newSession, { silent: true });
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setStore(null);
        setMember(null);
        setRole(null);
        setError(null);
        hasLoadedStoreRef.current = false;
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadStoreData, supabaseClient]);

  const value = {
    session,
    user,
    store,
    member,
    role,
    loading,
    error,
    isOwner: role === 'owner',
    isSeller: role === 'seller',
    refreshStore: () => loadStoreData(undefined, { silent: false })
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
