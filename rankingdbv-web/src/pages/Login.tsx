
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Settings, Server, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Server Config State
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('api_url') || import.meta.env.VITE_API_URL || 'http://localhost:3000');

  const handleSaveServer = () => {
    localStorage.setItem('api_url', serverUrl);
    window.location.reload(); // Reload to apply new axios config
  };

  // Force cleanup of any stuck modals
  useEffect(() => {
    document.body.style.overflow = 'unset';
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error('Digite seu email.');

    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      toast.success('Email de recuperação enviado!', {
        description: 'Verifique sua caixa de entrada (e o spam).'
      });
      setShowForgotModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar email.', {
        description: err.message
      });
    } finally {
      setForgotLoading(false);
    }
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success(`Login realizado com sucesso!`);
      navigate('/dashboard');

    } catch (err: any) {
      console.error(err);

      if (err.message === 'CONTA_INCOMPLETA') {
        const msg = 'Sua conta existe no Google, mas o cadastro do Clube não foi concluído.';
        setError(msg);
        toast.error(msg, {
          description: 'Redirecionando para completar seu cadastro...',
          duration: 5000
        });
        setTimeout(() => {
          navigate(`/register?email=${encodeURIComponent(email)}&resume=true`);
        }, 2000);
        return;
      }

      if (err.message?.includes('aguarda aprovação')) {
        setError(err.message);
        toast.info('Seu cadastro está sendo analisado!', {
          description: 'Aguarde até que a diretoria do seu clube aprove seu acesso.',
          duration: 6000
        });
        return;
      }

      if (err.message?.includes('bloqueada')) {
        setError(err.message);
        toast.error('Acesso Bloqueado', {
          description: 'Sua conta foi desativada pela diretoria.',
          duration: 6000
        });
        return;
      }

      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Email ou senha incorretos.');
        setError('Email ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        toast.error('Muitas tentativas falhas. Tente novamente mais tarde.');
        setError('Muitas tentativas. Aguarde.');
      } else {
        toast.error(err.message || 'Erro ao realizar login.');
        setError(`${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative z-[100]" translate="no">
        <div className="bg-blue-600 p-8 text-center relative">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cantinho DBV</h1>
          <p className="text-blue-100">Acesse o painel do seu clube</p>

          <button
            onClick={() => setShowSettings(true)}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10"
            title="Configurar Servidor"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <span className="font-bold">Erro:</span> {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="diretor@aguias.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email); // Pre-fill with current email if any
                  setShowForgotModal(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline mt-2 block ml-auto"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <span>Entrando...</span> : (<><span>Entrar no Sistema</span> <ArrowRight className="w-5 h-5" /></>)}
            </button>
          </form>

          {/* New Register Link */}
          <div className="mt-6 text-center text-sm text-slate-600">
            <span>Ainda não tem conta?</span>{' '}
            <a href="/register" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Criar conta
            </a>
          </div>
        </div>
      </div>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Configuração do Servidor">
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex gap-2 items-start">
            <Server className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Aqui você pode definir o endereço do servidor (backend). Isso é útil para acessar pelo celular na mesma rede Wi-Fi.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Endereço do Servidor (URL)</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="ex: http://192.168.0.10:3000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">Deve incluir http:// e a porta (geralmente :3000)</p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveServer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              Salvar e Recarregar
            </button>
          </div>
        </div>
      </Modal>

      {/* Suspended Access Modal */}
      <Modal isOpen={isSuspended} onClose={() => setIsSuspended(false)} title="Acesso Suspenso">
        <div className="text-center space-y-6 py-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-red-600" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">Assinatura Vencida</h3>
            <p className="text-slate-600">
              O acesso ao sistema para este clube está temporariamente bloqueado devido a pendências na assinatura.
            </p>
            <p className="text-sm text-slate-500">
              Entre em contato com o suporte para regularizar a situação e liberar o acesso imediatamente.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://wa.me/5591983292005?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20assinatura%20do%20meu%20clube%20no%20Cantinho%20DBV."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors mb-3"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-5 h-5 filter brightness-0 invert" />
              Falar com Suporte
            </a>
            <button
              onClick={() => setIsSuspended(false)}
              className="text-slate-500 hover:text-slate-700 text-sm font-medium"
            >
              Fechar e tentar novamente
            </button>
          </div>
        </div>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} title="Recuperar Senha">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-slate-600">
            Digite seu email abaixo. Enviaremos um link para você redefinir sua senha com segurança.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Seu Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="seu@email.com"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={forgotLoading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {forgotLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>
      </Modal>
    </>
  );
}
