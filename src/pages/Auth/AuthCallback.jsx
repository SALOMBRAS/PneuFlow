import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
          const user = session.user;
          const isInvited = user.user_metadata?.invited_to_store;
          
          if (isInvited) {
            // It's an invited seller, need to set password
            navigate('/auth/set-password', { replace: true });
          } else {
            // Normal user or already has password set
            navigate('/dashboard', { replace: true });
          }
        } else {
          // No session, go to login
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      color: 'var(--text-primary)'
    }}>
      <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Validando acesso...</p>
    </div>
  );
}
