
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag, Plus, Tag, Coins } from 'lucide-react';
import { Modal } from '../components/Modal';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    imageUrl?: string;
}

interface Purchase {
    id: string;
    product: Product;
    cost: number;
    status: string;
    createdAt: string;
}

export function Store() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'store' | 'inventory'>('store');

    // Create Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('-1');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('REAL');

    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ['products', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const response = await api.get(`/store/products/${user.clubId}`);
            return response.data;
        },
        enabled: !!user?.clubId
    });

    const { data: myPurchases = [] } = useQuery<Purchase[]>({
        queryKey: ['my-purchases'],
        queryFn: async () => {
            const response = await api.get('/store/inventory');
            return response.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/store/products', {
                ...data,
                clubId: user?.clubId,
                price: Number(data.price),
                stock: Number(data.stock)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsCreateModalOpen(false);
            setName('');
            setPrice('');
            setDescription('');
        }
    });

    const buyMutation = useMutation({
        mutationFn: async (productId: string) => {
            return api.post(`/store/buy/${productId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['my-purchases'] });
            // Atualizar saldo do usuário no contexto seria ideal, mas invalidateQueries em 'user' pode funcionar se configurado
            toast.success('Compra realizada com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro na compra: ' + (error.response?.data?.message || 'Saldo insuficiente ou erro desconhecido'));
        }
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({ name, price, stock, description, category });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">Loja Virtual</h1>
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        {user?.points || 0} Pontos
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('store')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'store' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Loja
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'inventory' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Meus Itens
                        </button>
                    </div>

                    {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Produto
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'store' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:border-blue-300 transition-colors">
                            <div className="h-40 bg-slate-100 flex items-center justify-center relative">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ShoppingBag className="w-12 h-12 text-slate-300" />
                                )}
                                <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    {product.category}
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-800 mb-1">{product.name}</h3>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>

                                <div className="mt-auto flex items-center justify-between">
                                    <span className="text-lg font-bold text-yellow-600 flex items-center gap-1">
                                        <Coins className="w-5 h-5" />
                                        {product.price}
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Comprar "${product.name}" por ${product.price} pontos?`)) {
                                                buyMutation.mutate(product.id);
                                            }
                                        }}
                                        disabled={(user?.points || 0) < product.price || buyMutation.isPending || (product.stock !== -1 && product.stock <= 0)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {product.stock !== -1 && product.stock <= 0 ? 'Esgotado' : 'Comprar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Item</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Custo</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Data</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {myPurchases.map(purchase => (
                                <tr key={purchase.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{purchase.product.name}</div>
                                        <div className="text-xs text-slate-500">{purchase.product.category}</div>
                                    </td>
                                    <td className="px-6 py-4 text-yellow-600 font-bold">{purchase.cost} pts</td>
                                    <td className="px-6 py-4 text-slate-600">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${purchase.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                            purchase.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {purchase.status === 'PENDING' ? 'Pendente' : purchase.status === 'DELIVERED' ? 'Entregue' : purchase.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {myPurchases.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Você ainda não comprou nada. Visite a loja!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Product Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Novo Produto">
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Preço (Pontos)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Estoque (-1 = Infinito)</label>
                            <input
                                type="number"
                                required
                                value={stock}
                                onChange={e => setStock(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        >
                            <option value="REAL">Item Físico (Real)</option>
                            <option value="VIRTUAL">Item Virtual</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg resize-none h-20"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                        <button type="submit" disabled={createMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            {createMutation.isPending ? 'Criando...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
