import { Modal } from './Modal';
import { ScrollText } from 'lucide-react';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept?: () => void;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Termos de Uso e Privacidade">
            <div className="space-y-4 text-slate-600 text-sm overflow-y-auto max-h-[60vh] p-1">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg mb-2">
                    <ScrollText className="w-6 h-6" />
                    <span>Cantinho DBV</span>
                </div>

                <p>
                    Bem-vindo ao <strong>Cantinho DBV</strong>. Ao criar uma conta e utilizar nossos serviços, você concorda com os seguintes termos e condições:
                </p>

                <h3 className="font-bold text-slate-800 mt-4">1. Uso do Sistema</h3>
                <p>
                    O Cantinho DBV é uma plataforma destinada ao gerenciamento de Clubes de Desbravadores. O uso é restrito a membros, diretores e responsáveis vinculados a clubes oficiais.
                </p>

                <h3 className="font-bold text-slate-800 mt-4">2. Dados e Privacidade</h3>
                <p>
                    Coletamos dados pessoais (nome, email, data de nascimento, etc.) exclusivamente para fins de gerenciamento do clube, ranking e comunicação interna. Seus dados não serão vendidos a terceiros.
                </p>
                <p>
                    A diretoria do seu clube terá acesso aos seus dados cadastrais para fins administrativos.
                </p>

                <h3 className="font-bold text-slate-800 mt-4">3. Responsabilidades</h3>
                <p>
                    É responsabilidade do usuário manter suas credenciais de acesso seguras. O sistema não se responsabiliza por acessos indevidos causados por compartilhamento de senhas.
                </p>
                <p>
                    O conteúdo postado (fotos, atas, relatórios) é de responsabilidade do usuário e deve estar em conformidade com os princípios cristãos e normas do Clube de Desbravadores.
                </p>

                <h3 className="font-bold text-slate-800 mt-4">4. Cancelamento</h3>
                <p>
                    Você pode solicitar a exclusão da sua conta a qualquer momento entrando em contato com a diretoria do seu clube ou com o suporte do sistema.
                </p>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                    {onAccept && (
                        <button
                            onClick={() => {
                                onAccept();
                                onClose();
                            }}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Li e Aceito
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
