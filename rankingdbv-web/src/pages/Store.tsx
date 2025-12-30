import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShoppingBag, Plus, Tag, Coins, PackageCheck, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { toast } from 'sonner';
import { ROLE_TRANSLATIONS } from './members/types';

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
    user?: { name: string; role: string }; // For Admin view
}

export function Store() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'store' | 'inventory' | 'admin'>('store');
    const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Create/Edit Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('-1');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('REAL');
    const [imageUrl, setImageUrl] = useState('');

    const isAdmin = ['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '');

    // Fetch fresh user data to ensure points are up-to-date
    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const docSnap = await getDoc(doc(db, 'users', user.id));
            return docSnap.exists() ? docSnap.data() : null;
        },
        enabled: !!user?.id,
        staleTime: 0, // Always fetch fresh
        refetchOnWindowFocus: true
    });

    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ['products', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'products'), where('clubId', '==', user.clubId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        },
        enabled: !!user?.clubId
    });

    const { data: myPurchases = [] } = useQuery<Purchase[]>({
        queryKey: ['my-purchases', user?.uid],
        queryFn: async () => {
            if (!user?.uid) return [];
            const q = query(collection(db, 'purchases'), where('userId', '==', user.uid)); // orderBy('createdAt', 'desc') needs index
            const snapshot = await getDocs(q);
            // Client side sort to avoid index issues for now
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        enabled: !!user?.uid,
        retry: false
    });

    const { data: clubPurchases = [] } = useQuery<Purchase[]>({
        queryKey: ['club-purchases', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'purchases'), where('clubId', '==', user.clubId));
            const snapshot = await getDocs(q);

            // Manual Join with User
            const purchases = await Promise.all(snapshot.docs.map(async (d) => {
                const data = d.data();
                const userSnap = await getDoc(doc(db, 'users', data.userId));
                return {
                    id: d.id,
                    ...data,
                    user: userSnap.exists() ? userSnap.data() : { name: 'Unknown', role: 'UNKNOWN' }
                } as Purchase;
            }));

            return purchases.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        enabled: activeTab === 'admin' && isAdmin
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await addDoc(collection(db, 'products'), {
                name: data.name,
                description: data.description,
                category: data.category,
                imageUrl: data.imageUrl,
                price: Number(data.price),
                stock: Number(data.stock),
                clubId: user?.clubId,
                createdAt: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsCreateModalOpen(false);
            resetForm();
            toast.success('Produto criado com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao criar produto: ' + (error.response?.data?.message || error.message));
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await updateDoc(doc(db, 'products', data.id), {
                name: data.name,
                description: data.description,
                category: data.category,
                imageUrl: data.imageUrl,
                price: Number(data.price),
                stock: Number(data.stock)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsCreateModalOpen(false);
            setEditingProduct(null);
            resetForm();
            toast.success('Produto atualizado com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar produto: ' + (error.response?.data?.message || error.message));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (productId: string) => {
            await deleteDoc(doc(db, 'products', productId));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Produto excluído com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao excluir produto: ' + (error.response?.data?.message || error.message));
        }
    });

    const buyMutation = useMutation({
        mutationFn: async (productId: string) => {
            return runTransaction(db, async (transaction) => {
                if (!user?.uid) throw new Error("Usuário não autenticado.");
                const productRef = doc(db, 'products', productId);
                const userRef = doc(db, 'users', user.uid); // Current user

                const productDoc = await transaction.get(productRef);
                const userDoc = await transaction.get(userRef);

                if (!productDoc.exists()) throw new Error("Produto não encontrado.");
                if (!userDoc.exists()) throw new Error("Usuário não encontrado.");

                const productData = productDoc.data();
                const userData = userDoc.data();

                // Check Stock
                if (productData.stock !== -1 && productData.stock <= 0) {
                    throw new Error("Produto esgotado.");
                }
                // Check Points
                const points = userData.points || 0;
                if (points < productData.price) {
                    throw new Error("Saldo insuficiente.");
                }

                // 1. Deduct Stock
                if (productData.stock !== -1) {
                    transaction.update(productRef, { stock: productData.stock - 1 });
                }

                // 2. Deduct Points
                transaction.update(userRef, { points: points - productData.price });

                // 3. Create Purchase Record
                // Using 'add' behavior in transaction needs a ref to be created first
                const purchaseRef = doc(collection(db, 'purchases'));
                transaction.set(purchaseRef, {
                    userId: user!.uid,
                    productId: productId,
                    product: productData, // Snapshot
                    cost: productData.price,
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                    clubId: user?.clubId
                });

                // 4. Log Transaction
                const logRef = doc(collection(db, 'points_logs'));
                transaction.set(logRef, {
                    userId: user!.uid,
                    activityId: 'PURCHASE',
                    points: -productData.price,
                    reason: `Compra: ${productData.name}`,
                    type: 'PURCHASE',
                    createdAt: new Date().toISOString(),
                    clubId: user?.clubId
                });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['my-purchases'] });
            queryClient.invalidateQueries({ queryKey: ['user-profile'] }); // Refresh points
            toast.success('Compra realizada com sucesso!');
        },
        onError: (error: any) => {
            console.error('Buy error:', error);
            const msg = error.message; // Transaction errors throw normal errors
            toast.error(`Erro na compra: ${msg || 'Falha desconhecida.'}`);
        }
    });

    const deliverMutation = useMutation({
        mutationFn: async (purchaseId: string) => {
            await updateDoc(doc(db, 'purchases', purchaseId), { status: 'DELIVERED', deliveredAt: new Date().toISOString() });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['club-purchases'] });
            toast.success('Produto marcado como entregue!');
        }
    });

    const refundMutation = useMutation({
        mutationFn: async (purchaseId: string) => {
            return runTransaction(db, async (transaction) => {
                const purchaseRef = doc(db, 'purchases', purchaseId);
                const purchaseDoc = await transaction.get(purchaseRef);
                if (!purchaseDoc.exists()) throw new Error("Compra não encontrada.");

                const purchaseData = purchaseDoc.data();
                if (purchaseData.status === 'REFUNDED') throw new Error("Compra já estornada.");

                const userRef = doc(db, 'users', purchaseData.userId);
                const userDoc = await transaction.get(userRef);

                // 1. Restore Stock (if product still exists, nice to have but product might be deleted so safeguard)
                // If we had product snapshot we know the ID.
                if (purchaseData.productId) {
                    const productRef = doc(db, 'products', purchaseData.productId);
                    const productDoc = await transaction.get(productRef);
                    if (productDoc.exists()) {
                        const prodData = productDoc.data();
                        if (prodData.stock !== -1) {
                            transaction.update(productRef, { stock: prodData.stock + 1 });
                        }
                    }
                }

                // 2. Restore Points
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    transaction.update(userRef, { points: (userData.points || 0) + purchaseData.cost });
                }

                // 3. Mark Refunded
                transaction.update(purchaseRef, { status: 'REFUNDED', refundedAt: new Date().toISOString() });

                // 4. Log Refund
                const logRef = doc(collection(db, 'points_logs'));
                transaction.set(logRef, {
                    userId: purchaseData.userId,
                    activityId: 'REFUND',
                    points: purchaseData.cost,
                    reason: `Estorno: ${purchaseData.product?.name || 'Compra'}`,
                    type: 'REFUND',
                    createdAt: new Date().toISOString(),
                    clubId: purchaseData.clubId
                });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['club-purchases'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            toast.success('Compra estornada com sucesso!');
        },
        onError: (err: any) => toast.error('Erro ao estornar: ' + err.message)
    });

    const resetForm = () => {
        setName('');
        setPrice('');
        setStock('-1');
        setDescription('');
        setCategory('REAL');
        setImageUrl('');
    };

    const handleOpenCreate = () => {
        setEditingProduct(null);
        resetForm();
        setIsCreateModalOpen(true);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingProduct(product);
        setName(product.name);
        setPrice(String(product.price));
        setStock(String(product.stock));
        setDescription(product.description || '');
        setCategory(product.category);
        setImageUrl(product.imageUrl || '');
        setIsCreateModalOpen(true);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        const formData = new FormData();
        formData.append('file', file);

        try {
            toast.info('Enviando imagem...');
            const res = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const fullUrl = res.data.url.startsWith('http')
                ? res.data.url
                : `${api.defaults.baseURL?.replace('/api', '')}${res.data.url}`;

            setImageUrl(fullUrl);
            toast.success('Imagem enviada com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar imagem.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, name, price, stock, description, category, imageUrl });
        } else {
            createMutation.mutate({ name, price, stock, description, category, imageUrl });
        }
    };

    // Derived State
    const categories = ['TODOS', ...Array.from(new Set(products.map(p => p.category)))];
    const filteredProducts = selectedCategory === 'TODOS'
        ? products
        : products.filter(p => p.category === selectedCategory);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">Loja Virtual</h1>
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        {isLoadingUser ? '...' : (currentUser?.points || 0) + ' Pontos'}
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
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('admin')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${activeTab === 'admin' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <PackageCheck className="w-4 h-4" /> Gestão
                            </button>
                        )}
                    </div>

                    {isAdmin && activeTab === 'store' && (
                        <button
                            onClick={handleOpenCreate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Produto
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'store' && (
                <>
                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:border-blue-300 transition-colors relative">
                                <div className="h-40 bg-slate-100 flex items-center justify-center relative">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <ShoppingBag className="w-12 h-12 text-slate-300" />
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <span className="bg-white/90 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            {product.category}
                                        </span>
                                        {product.stock >= 0 && product.stock < 5 && (
                                            <span className="bg-red-100 px-2 py-1 rounded text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse" title="Estoque Baixo">
                                                <AlertCircle className="w-3 h-3" />
                                                {product.stock}
                                            </span>
                                        )}
                                    </div>

                                    {/* Admin Actions Overlay */}
                                    {isAdmin && (
                                        <div className="absolute top-2 left-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenEdit(product)}
                                                className="bg-white p-1.5 rounded-full shadow hover:bg-blue-50 text-blue-600"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Excluir "${product.name}"?`)) {
                                                        deleteMutation.mutate(product.id);
                                                    }
                                                }}
                                                className="bg-white p-1.5 rounded-full shadow hover:bg-red-50 text-red-600"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

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
                                            disabled={
                                                (currentUser?.points || 0) < product.price ||
                                                buyMutation.isPending ||
                                                (product.stock !== -1 && product.stock <= 0)
                                            }
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {product.stock !== -1 && product.stock <= 0 ? 'Esgotado' : 'Comprar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                Nenhum produto encontrado nesta categoria.
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'inventory' && (
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
                                <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{purchase.product?.name || 'Item Removido'}</div>
                                        <div className="text-xs text-slate-500">{purchase.product?.category || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-yellow-600 font-bold">{purchase.cost} pts</td>
                                    <td className="px-6 py-4 text-slate-600">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${purchase.status === 'DELIVERED' || purchase.status === 'APPLIED' ? 'bg-green-100 text-green-700' :
                                            purchase.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                purchase.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {purchase.status === 'PENDING' ? 'Entregar' :
                                                purchase.status === 'DELIVERED' ? 'Entregue' :
                                                    purchase.status === 'APPLIED' ? 'Ativado' :
                                                        purchase.status === 'REFUNDED' ? 'Estornado' :
                                                            purchase.status}
                                        </span>
                                        {purchase.status === 'PENDING' && (
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                Procure a diretoria.
                                            </div>
                                        )}
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

            {activeTab === 'admin' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Pedidos do Clube</h3>
                        <span className="text-xs text-slate-500">Mostrando últimos 50 pedidos</span>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Solicitante</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Item</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Custo</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clubPurchases.map(purchase => (
                                <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{purchase.user?.name || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500 capitalize">{ROLE_TRANSLATIONS[purchase.user?.role || ''] || purchase.user?.role || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{purchase.product?.name || 'Item Removido'}</div>
                                        <div className="text-xs text-slate-500">{purchase.product?.category || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-yellow-600 font-bold">{purchase.cost} pts</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${purchase.status === 'DELIVERED' || purchase.status === 'APPLIED' ? 'bg-green-100 text-green-700' :
                                            purchase.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                purchase.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {purchase.status === 'PENDING' ? 'Pendente' :
                                                purchase.status === 'DELIVERED' ? 'Entregue' :
                                                    purchase.status === 'REFUNDED' ? 'Estornado' :
                                                        purchase.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {purchase.status === 'PENDING' && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('Marcar como ENTREGUE?')) {
                                                        deliverMutation.mutate(purchase.id);
                                                    }
                                                }}
                                                disabled={deliverMutation.isPending}
                                                className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                            >
                                                Marcar Entregue
                                            </button>
                                        )}
                                        {(purchase.status === 'PENDING' || purchase.status === 'DELIVERED' || purchase.status === 'APPLIED') && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('ESTORNAR compra? O valor será devolvido e o estoque reposto.')) {
                                                        refundMutation.mutate(purchase.id);
                                                    }
                                                }}
                                                disabled={refundMutation.isPending}
                                                className="ml-2 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                                title="Estornar Valor e Estoque"
                                            >
                                                Estornar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {clubPurchases.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum pedido registrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Product Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingProduct ? "Editar Produto" : "Novo Produto"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            <option value="UNIFORME">Uniforme</option>
                            <option value="ACAMPAMENTO">Acampamento</option>
                            <option value="ESPECIALIDADES">Especialidades</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Imagem do Produto</label>
                        <div className="flex items-center gap-4">
                            {imageUrl && (
                                <img src={imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleUpload}
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                        {imageUrl && <p className="text-xs text-green-600 mt-1">Imagem carregada com sucesso!</p>}
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
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Criar')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
