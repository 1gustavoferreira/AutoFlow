import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Plus, CheckCircle2, Clock, Play, MessageSquare, 
  Car, User, Trash2, RefreshCw, Search, Printer, X, CreditCard, 
  Activity, Check, Edit3, DollarSign, TrendingDown, TrendingUp, Wallet, History, ShieldCheck
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1'
});

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  type: 'SERVICO' | 'PECA';
  status?: 'ATIVO' | 'DISPENSADO';
  originalPrice?: number;
}

interface ServiceOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  serviceDescription: string;
  totalValue: number;
  status: 'AGUARDANDO' | 'EM_ANDAMENTO' | 'FINALIZADO';
  paymentMethod?: string;
  items?: ServiceItem[];
  createdAt?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'finance'>('kanban');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ServiceOrder | null>(null);

  const [finishingOrder, setFinishingOrder] = useState<ServiceOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [itemInputName, setItemInputName] = useState('');
  const [itemInputPrice, setItemInputPrice] = useState('');
  const [itemInputType, setItemInputType] = useState<'SERVICO' | 'PECA'>('SERVICO');

  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Pecas / Fornecedores');

  const vehicleHistory = useMemo(() => {
    const placaClean = vehiclePlate.trim().toUpperCase();
    if (!placaClean || placaClean.length < 3) return [];
    return orders.filter(o => o.vehiclePlate && o.vehiclePlate.toUpperCase().trim() === placaClean);
  }, [orders, vehiclePlate]);

  const calculatedTotal = useMemo(() => {
    return items
      .filter(it => it.status !== 'DISPENSADO')
      .reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  }, [items]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      const data: ServiceOrder[] = res.data || [];
      const withEnrichedData = data.map(o => {
        let storedItems: ServiceItem[] = [];
        try {
          const raw = localStorage.getItem(`autoflow_items_${o.id}`);
          if (raw) storedItems = JSON.parse(raw);
        } catch (_) {}

        return {
          ...o,
          paymentMethod: localStorage.getItem(`autoflow_pay_${o.id}`) || 'PIX',
          items: storedItems.length > 0 ? storedItems : [
            { id: 'default', name: o.serviceDescription || 'Servico Geral', price: o.totalValue, type: 'SERVICO', status: 'ATIVO' }
          ]
        };
      });
      setOrders(withEnrichedData);
    } catch (err) {
      console.error('Erro ao buscar ordens:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = () => {
    try {
      const raw = localStorage.getItem('autoflow_expenses');
      if (raw) setExpenses(JSON.parse(raw));
    } catch (_) {}
  };

  useEffect(() => {
    fetchOrders();
    loadExpenses();
  }, []);

  const handleSearchPlate = () => {
    const placaClean = vehiclePlate.trim().toUpperCase();
    if (!placaClean || placaClean.length < 3) {
      alert('Digite uma placa válida para buscar.');
      return;
    }

    const found = orders.find(o => o.vehiclePlate && o.vehiclePlate.toUpperCase().trim() === placaClean);
    if (found) {
      setCustomerName(found.customerName || '');
      setCustomerPhone(found.customerPhone || '');
      setVehicleModel(found.vehicleModel || '');
      alert(`Veículo ${placaClean} encontrado no histórico! Dados preenchidos.`);
    } else {
      alert(`Nenhum histórico anterior encontrado para a placa ${placaClean}. Preencha os dados normalmente.`);
    }
  };

  const saveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(expAmount.replace(',', '.')) || 0;
    if (!expDesc.trim() || val <= 0) {
      alert('Informe uma descricao valida e um valor maior que zero.');
      return;
    }
    const newExp: Expense = {
      id: Date.now().toString(),
      description: expDesc.trim(),
      amount: val,
      category: expCategory,
      date: new Date().toLocaleDateString('pt-BR')
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    localStorage.setItem('autoflow_expenses', JSON.stringify(updated));
    setExpDesc('');
    setExpAmount('');
  };

  const deleteExpense = (id: string) => {
    if (!confirm('Deseja excluir esta despesa?')) return;
    const updated = expenses.filter(ex => ex.id !== id);
    setExpenses(updated);
    localStorage.setItem('autoflow_expenses', JSON.stringify(updated));
  };

  const openNewModal = () => {
    setEditingOrder(null);
    setCustomerName('');
    setCustomerPhone('');
    setVehiclePlate('');
    setVehicleModel('');
    setItems([]);
    setItemInputName('');
    setItemInputPrice('');
    setShowModal(true);
  };

  const openEditModal = (order: ServiceOrder) => {
    setEditingOrder(order);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone);
    setVehiclePlate(order.vehiclePlate);
    setVehicleModel(order.vehicleModel);
    setItems(order.items && order.items.length > 0 ? [...order.items] : [
      { id: '1', name: order.serviceDescription, price: order.totalValue, type: 'SERVICO', status: 'ATIVO' }
    ]);
    setItemInputName('');
    setItemInputPrice('');
    setShowModal(true);
  };

  const addItemToForm = () => {
    if (!itemInputName.trim()) {
      alert('Preencha a descricao do item ou servico.');
      return;
    }
    const priceVal = parseFloat(itemInputPrice.replace(',', '.')) || 0;
    if (priceVal <= 0) {
      alert('Informe um valor valido maior que zero.');
      return;
    }
    const newItem: ServiceItem = {
      id: Date.now().toString(),
      name: itemInputName.trim(),
      price: priceVal,
      type: itemInputType,
      status: 'ATIVO'
    };
    setItems(prev => [...prev, newItem]);
    setItemInputName('');
    setItemInputPrice('');
  };

  const removeItemFromForm = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleDispensarItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const isDispensado = item.status === 'DISPENSADO';
        return {
          ...item,
          status: isDispensado ? 'ATIVO' : 'DISPENSADO',
          price: isDispensado ? (item.originalPrice || item.price) : 0,
          originalPrice: item.originalPrice || item.price
        };
      }
      return item;
    }));
  };

  const handleKeyDownForm = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('data-item-input') === 'true') {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItemToForm();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || calculatedTotal <= 0) {
      alert('A comanda precisa de ao menos um servico ou peca ativo.');
      return;
    }

    const summaryDescription = items
      .map(i => {
        if (i.status === 'DISPENSADO') {
          return `[CANCELADO] ${i.name} (R$ 0,00)`;
        }
        return `[${i.type === 'PECA' ? 'Peca' : 'Servico'}] ${i.name} (R$ ${i.price.toFixed(2)})`;
      })
      .join(' + ');

    try {
      if (editingOrder) {
        await api.put(`/orders/${editingOrder.id}`, {
          customerName,
          customerPhone,
          vehiclePlate,
          vehicleModel,
          serviceDescription: summaryDescription,
          totalValue: calculatedTotal
        });
        localStorage.setItem(`autoflow_items_${editingOrder.id}`, JSON.stringify(items));
      } else {
        await api.post('/orders', {
          customerName,
          customerPhone,
          vehiclePlate,
          vehicleModel,
          serviceDescription: summaryDescription,
          totalValue: calculatedTotal
        });
      }

      setShowModal(false);
      fetchOrders();
    } catch (err: any) {
      alert('Erro ao salvar OS: ' + (err?.response?.data?.message || err.message));
    }
  };

  const updateStatusDirect = async (id: number, newStatus: ServiceOrder['status']) => {
    try {
      await api.patch(`/orders/${id}/status?status=${newStatus}`);
      fetchOrders();
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + (err?.response?.data?.message || err.message));
    }
  };

  const confirmFinishWithPayment = async () => {
    if (!finishingOrder) return;
    try {
      await api.patch(`/orders/${finishingOrder.id}/status?status=FINALIZADO`);
      localStorage.setItem(`autoflow_pay_${finishingOrder.id}`, paymentMethod);
      setFinishingOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert('Erro ao finalizar OS: ' + (err?.response?.data?.message || err.message));
    }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm('Deseja realmente remover esta Ordem de Servico?')) return;
    try {
      await api.delete(`/orders/${id}`);
      localStorage.removeItem(`autoflow_pay_${id}`);
      localStorage.removeItem(`autoflow_items_${id}`);
      fetchOrders();
    } catch (err: any) {
      alert('Erro ao excluir OS: ' + (err?.response?.data?.message || err.message));
    }
  };

  const openWhatsApp = (order: ServiceOrder) => {
    const orderItems = order.items && order.items.length > 0 ? order.items : [];
    const activeItems = orderItems.filter(it => it.status !== 'DISPENSADO');
    const itemsList = activeItems.map(it => {
      const type = it.type === 'PECA' ? 'Peca' : 'Servico';
      return `  - [${type}] ${it.name}: R$ ${Number(it.price).toFixed(2)}`;
    }).join('\n');

    const dispensados = orderItems.filter(it => it.status === 'DISPENSADO');
    const dispensadosNotice = dispensados.length > 0
      ? `\n\n_Itens checados que nao precisaram de troca:_\n${dispensados.map(d => `  x ~${d.name}~ (Dispensado)`).join('\n')}`
      : '';

    const lines = [
      `*--- AUTOFLOW | VEICULO PRONTO ---*\n`,
      `Ola, *${order.customerName}*! Tudo bem?`,
      `O seu veiculo *${order.vehicleModel}* (Placa: *${order.vehiclePlate}*) ja esta finalizado e pronto para retirada!\n`,
      `*OS #${order.id} - RESUMO:*`,
      itemsList || `  - ${order.serviceDescription}`,
      dispensadosNotice,
      `\n*Total:* R$ ${Number(order.totalValue).toFixed(2)}`,
      `*Garantia:* 90 dias em servicos e pecas\n`,
      `Ja estamos a disposicao para entrega das chaves. Pode passar quando quiser!`
    ].filter(Boolean);

    const message = lines.join('\n');
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(o => 
      o.vehiclePlate.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.vehicleModel.toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  }, [orders, searchTerm]);

  const totalRevenue = orders
    .filter(o => o.status === 'FINALIZADO')
    .reduce((acc, o) => acc + Number(o.totalValue || 0), 0);

  const totalExpenses = expenses.reduce((acc, ex) => acc + Number(ex.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const columns = [
    { key: 'AGUARDANDO', title: 'Fila / Espera', badgeColor: 'bg-neutral-800 text-neutral-300 border border-neutral-700', dotColor: 'bg-neutral-500', description: 'Veiculos na triagem' },
    { key: 'EM_ANDAMENTO', title: 'Em Execucao', badgeColor: 'bg-red-950/50 text-red-400 border border-red-800/60', dotColor: 'bg-red-500', description: 'Na rampa de servico' },
    { key: 'FINALIZADO', title: 'Pronto / Liberado', badgeColor: 'bg-neutral-800 text-red-400 border border-red-900/50', dotColor: 'bg-red-600', description: 'Aguardando retirada' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-200 antialiased font-sans pb-12">
      <header className="bg-[#121216] border-b border-neutral-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
                <Wrench size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-white tracking-wider uppercase">AutoFlow</h1>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-neutral-800 text-red-400 border border-red-900/40">SaaS</span>
                </div>
                <p className="text-xs text-neutral-400">Oficina & Gestao de Caixa</p>
              </div>
            </div>

            <div className="flex sm:hidden bg-[#18181e] p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setActiveTab('kanban')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase transition ${activeTab === 'kanban' ? 'bg-red-600 text-white shadow' : 'text-neutral-400'}`}
              >
                OS
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase transition ${activeTab === 'finance' ? 'bg-red-600 text-white shadow' : 'text-neutral-400'}`}
              >
                Caixa
              </button>
            </div>
          </div>

          <div className="hidden sm:flex bg-[#18181e] p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'kanban' ? 'bg-red-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
            >
              Patio & OS
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'finance' ? 'bg-red-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
            >
              Financeiro / Caixa
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <div className="bg-[#18181e] border border-neutral-800 px-3 py-1.5 rounded-xl">
                <span className="text-[9px] text-neutral-400 uppercase font-bold block tracking-wider">Entradas</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">R$ {totalRevenue.toFixed(2)}</span>
              </div>
              <div className="bg-[#18181e] border border-neutral-800 px-3 py-1.5 rounded-xl">
                <span className="text-[9px] text-neutral-400 uppercase font-bold block tracking-wider">Saidas</span>
                <span className="text-xs sm:text-sm font-black text-red-400 font-mono">R$ {totalExpenses.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={openNewModal}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition shrink-0"
            >
              <Plus size={16} /> Nova OS
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'kanban' && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar placa, modelo, cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#141418] border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:border-red-600 outline-none"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 text-xs text-neutral-400">
              <span>{filteredOrders.length} veiculo(s) cadastrados</span>
              <button onClick={fetchOrders} className="p-2 bg-[#141418] border border-neutral-800 hover:text-white rounded-lg transition" title="Atualizar">
                <RefreshCw size={14} className={loading ? 'animate-spin text-red-500' : ''} />
              </button>
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {columns.map(col => {
              const colOrders = filteredOrders.filter(o => o.status === col.key);
              return (
                <div key={col.key} className="bg-[#121216] border border-neutral-800 rounded-2xl p-4 flex flex-col space-y-4 shadow-xl lg:min-h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                      <div>
                        <h2 className="text-xs font-black text-neutral-200 uppercase tracking-wider">{col.title}</h2>
                        <span className="text-[10px] text-neutral-500 block">{col.description}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-md ${col.badgeColor}`}>{colOrders.length}</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    {colOrders.length === 0 ? (
                      <div className="h-36 lg:h-44 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl text-neutral-600 text-xs">
                        Nenhum veiculo nesta etapa
                      </div>
                    ) : (
                      colOrders.map(order => (
                        <div key={order.id} className="bg-[#18181e] border border-neutral-800 hover:border-neutral-700 transition rounded-xl p-4 space-y-3 shadow-md">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono text-neutral-500 font-bold block">OS #{order.id}</span>
                              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                                <Car size={15} className="text-red-500 shrink-0" /> {order.vehicleModel}
                              </h3>
                            </div>
                            <div className="bg-[#0a0a0c] border border-neutral-700 rounded px-2.5 py-0.5 text-center shadow-inner shrink-0">
                              <span className="text-[7px] font-black text-neutral-400 tracking-wider block leading-none">BRASIL</span>
                              <span className="text-xs font-mono font-black text-white tracking-wider">{order.vehiclePlate}</span>
                            </div>
                          </div>

                          <div className="bg-[#121216] p-2.5 rounded-lg border border-neutral-800 space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-neutral-500 block">Itens & Servicos:</span>
                            {order.items && order.items.length > 0 ? (
                              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                {order.items.map((it, idx) => {
                                  const isDisp = it.status === 'DISPENSADO';
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[11px]">
                                      <span className={`pr-2 ${isDisp ? 'line-through text-neutral-500' : 'text-neutral-300'}`}>
                                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded mr-1 ${isDisp ? 'bg-neutral-800 text-neutral-500' : it.type === 'PECA' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                                          {isDisp ? 'DISPENSADO' : it.type === 'PECA' ? 'PECA' : 'MO'}
                                        </span>
                                        {it.name}
                                      </span>
                                      <span className={`font-mono shrink-0 ${isDisp ? 'text-neutral-500 line-through' : 'text-neutral-400'}`}>R$ {Number(it.price).toFixed(2)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-neutral-300 leading-snug">{order.serviceDescription}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-800">
                            <div className="flex items-center gap-1.5 text-neutral-400">
                              <User size={13} className="text-neutral-500 shrink-0" />
                              <span className="truncate max-w-[130px] font-medium text-neutral-300">{order.customerName}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-white block">R$ {Number(order.totalValue).toFixed(2)}</span>
                              {order.status === 'FINALIZADO' && (
                                <span className="text-[9px] font-mono text-red-400 bg-red-950/40 border border-red-800/50 px-2 py-0.5 rounded font-bold">{order.paymentMethod}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-800 flex-wrap sm:flex-nowrap">
                            {order.status === 'AGUARDANDO' && (
                              <button onClick={() => updateStatusDirect(order.id, 'EM_ANDAMENTO')} className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1.5">
                                <Play size={13} className="text-red-500" /> Iniciar
                              </button>
                            )}
                            {order.status === 'EM_ANDAMENTO' && (
                              <button onClick={() => { setPaymentMethod('PIX'); setFinishingOrder(order); }} className="flex-1 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-800/60 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1.5">
                                <CheckCircle2 size={14} className="text-red-500" /> Baixar / Receber
                              </button>
                            )}
                            {order.status === 'FINALIZADO' && (
                              <button onClick={() => openWhatsApp(order)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30">
                                <MessageSquare size={13} /> Whats PRO
                              </button>
                            )}
                            <button onClick={() => openEditModal(order)} className="p-2 text-neutral-400 hover:text-white bg-[#121216] border border-neutral-800 rounded-lg" title="Editar">
                              <Edit3 size={13} />
                            </button>
                            <button onClick={() => setSelectedReceipt(order)} className="p-2 text-neutral-400 hover:text-white bg-[#121216] border border-neutral-800 rounded-lg" title="Imprimir">
                              <Printer size={13} />
                            </button>
                            <button onClick={() => deleteOrder(order.id)} className="p-2 text-neutral-500 hover:text-red-400 bg-[#121216] border border-neutral-800 rounded-lg" title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </main>
        </>
      )}

      {activeTab === 'finance' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#121216] border border-neutral-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Faturamento (OSs)</span>
                <span className="text-2xl font-mono font-black text-emerald-400 mt-1 block">R$ {totalRevenue.toFixed(2)}</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"><TrendingUp size={24} /></div>
            </div>
            <div className="bg-[#121216] border border-neutral-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Total de Despesas</span>
                <span className="text-2xl font-mono font-black text-red-400 mt-1 block">R$ {totalExpenses.toFixed(2)}</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0"><TrendingDown size={24} /></div>
            </div>
            <div className="bg-[#121216] border border-neutral-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Lucro Liquido do Caixa</span>
                <span className={`text-2xl font-mono font-black mt-1 block ${netProfit >= 0 ? 'text-white' : 'text-red-500'}`}>R$ {netProfit.toFixed(2)}</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0"><Wallet size={24} /></div>
            </div>
          </div>

          <div className="bg-[#121216] border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-red-500" /> Lancar Nova Despesa ou Custo Operacional
            </h3>
            <form onSubmit={saveExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Descricao</label>
                <input type="text" placeholder="Ex: Compra de Oleo, Aluguel..." value={expDesc} onChange={e => setExpDesc(e.target.value)} className="w-full bg-[#0a0a0c] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none" required />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Categoria</label>
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)} className="w-full bg-[#0a0a0c] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="Pecas / Fornecedores">Pecas / Fornecedores</option>
                  <option value="Ferramentas / Equipamentos">Ferramentas / Equipamentos</option>
                  <option value="Agua / Luz / Aluguel">Agua / Luz / Aluguel</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Valor (R$)</label>
                <input type="text" placeholder="0.00" value={expAmount} onChange={e => setExpAmount(e.target.value)} className="w-full bg-[#0a0a0c] border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-red-400 outline-none" required />
              </div>
              <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl transition shadow-lg shadow-red-600/30">Adicionar Despesa</button>
            </form>
          </div>

          <div className="bg-[#121216] border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Historico de Saidas e Despesas</h3>
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">Nenhuma despesa lancada ate o momento.</div>
              ) : (
                expenses.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between bg-[#18181e] border border-neutral-800 px-4 py-3 rounded-xl text-xs gap-3">
                    <div className="space-y-0.5 truncate">
                      <span className="font-bold text-white block truncate">{ex.description}</span>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">{ex.category}</span>
                        <span>{ex.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono font-black text-red-400 text-sm">- R$ {Number(ex.amount).toFixed(2)}</span>
                      <button onClick={() => deleteExpense(ex.id)} className="p-1.5 text-neutral-500 hover:text-red-400 transition rounded-lg" title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {finishingOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-neutral-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase">Baixa OS #{finishingOrder.id}</h3>
              <button onClick={() => setFinishingOrder(null)} className="text-neutral-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="bg-[#0a0a0c] p-3.5 rounded-xl border border-neutral-800 space-y-1">
              <div className="flex justify-between text-xs text-neutral-400"><span>Veiculo:</span><span className="text-white font-bold">{finishingOrder.vehicleModel}</span></div>
              <div className="flex justify-between text-xs items-center pt-1 border-t border-neutral-800">
                <span className="text-neutral-400">Valor Total:</span>
                <span className="text-red-500 font-mono font-black text-base">R$ {Number(finishingOrder.totalValue).toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Metodo de Recebimento</label>
              <div className="grid grid-cols-2 gap-2">
                {['PIX', 'Cartao Debito', 'Cartao Credito', 'Dinheiro'].map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-between ${paymentMethod === m ? 'bg-red-600 text-white border-red-500' : 'bg-[#0a0a0c] text-neutral-300 border-neutral-800'}`}>
                    <span>{m}</span>{paymentMethod === m && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button onClick={() => setFinishingOrder(null)} className="w-1/2 py-2.5 bg-neutral-800 text-neutral-300 text-xs font-bold uppercase rounded-xl">Voltar</button>
              <button onClick={confirmFinishWithPayment} className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-neutral-800 w-full max-w-xl rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase">{editingOrder ? `Editar OS #${editingOrder.id}` : 'Nova Ordem de Servico'}</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white"><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveOrder} onKeyDown={handleKeyDownForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Placa do Veiculo</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="ABC1D23" 
                      value={vehiclePlate} 
                      onChange={e => setVehiclePlate(e.target.value)} 
                      className="flex-1 bg-[#0a0a0c] border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono uppercase text-red-400 font-black outline-none" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={handleSearchPlate}
                      className="px-3 bg-red-600 hover:bg-red-500 text-white border border-red-500 rounded-xl text-xs font-bold flex items-center justify-center transition shadow-md shadow-red-600/30"
                      title="Buscar Placa Cadastrada"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Veiculo / Modelo</label>
                  <input type="text" placeholder="Ex: Saveiro 1.6" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className="w-full bg-[#0a0a0c] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Cliente</label>
                  <input type="text" placeholder="Nome do cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-[#0a0a0c] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">WhatsApp</label>
                  <input type="text" placeholder="41999998888" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-[#0a0a0c] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono" required />
                </div>
              </div>

              {/* PRONTUÁRIO / HISTÓRICO DE MANUTENÇÃO COMPLETO */}
              {vehicleHistory.length > 0 && (
                <div className="bg-[#121216] border border-red-900/40 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-neutral-800 pb-2">
                    <span className="font-bold text-red-400 uppercase flex items-center gap-1.5">
                      <History size={14} /> Prontuario & Historico Completo ({vehiclePlate.toUpperCase()})
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">{vehicleHistory.length} visita(s) anterior(es)</span>
                  </div>
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {vehicleHistory.map(hist => (
                      <div key={hist.id} className="bg-[#0a0a0c] border border-neutral-800 rounded-xl p-3 text-xs space-y-2 shadow-inner">
                        <div className="flex justify-between items-center font-bold text-white">
                          <span>OS #{hist.id} - {hist.vehicleModel}</span>
                          <span className="text-red-400 font-mono text-sm">R$ {Number(hist.totalValue).toFixed(2)}</span>
                        </div>
                        <div className="space-y-1 bg-[#141418] p-2 rounded-lg border border-neutral-800/80">
                          <span className="text-[9px] uppercase font-bold text-neutral-500 block">Servicos e Pecas realizados:</span>
                          {hist.items && hist.items.length > 0 ? (
                            hist.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] py-0.5 border-b border-neutral-800/40 last:border-none">
                                <span className="text-neutral-300">
                                  <span className={`text-[8px] font-bold px-1 py-0.2 rounded mr-1 ${it.type === 'PECA' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                                    {it.type === 'PECA' ? 'PECA' : 'MO'}
                                  </span>
                                  {it.name}
                                </span>
                                <span className="font-mono text-neutral-400">R$ {Number(it.price).toFixed(2)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-neutral-300 text-xs">{hist.serviceDescription}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-neutral-800 rounded-xl p-3 bg-[#0a0a0c] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-neutral-300 uppercase">Pecas & Servicos da Comanda</span>
                  <span className="text-[10px] text-neutral-500">Enter inclui</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <select value={itemInputType} onChange={e => setItemInputType(e.target.value as any)} className="bg-[#141418] border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white outline-none w-full sm:w-auto">
                      <option value="SERVICO">Servico</option>
                      <option value="PECA">Peca</option>
                    </select>
                  </div>
                  <input type="text" data-item-input="true" placeholder="Ex: Filtro de ar..." value={itemInputName} onChange={e => setItemInputName(e.target.value)} className="flex-1 w-full bg-[#141418] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input type="text" data-item-input="true" placeholder="R$ 0.00" value={itemInputPrice} onChange={e => setItemInputPrice(e.target.value)} className="flex-1 sm:w-24 bg-[#141418] border border-neutral-700 rounded-lg px-2 py-2 text-xs font-mono text-red-400 font-bold outline-none" />
                    <button type="button" onClick={addItemToForm} className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg"><Plus size={14} /></button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <div className="text-center py-4 text-xs text-neutral-600 border border-dashed border-neutral-800 rounded-lg">Nenhum item adicionado ainda.</div>
                  ) : (
                    items.map(it => {
                      const isDispensado = it.status === 'DISPENSADO';
                      return (
                        <div key={it.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${isDispensado ? 'bg-neutral-900/40 border-neutral-800 opacity-60' : 'bg-[#141418] border-neutral-800'}`}>
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isDispensado ? 'bg-neutral-800 text-neutral-400 line-through' : it.type === 'PECA' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                              {isDispensado ? 'DISPENSADO' : it.type === 'PECA' ? 'PECA' : 'SERVICO'}
                            </span>
                            <span className={`font-medium truncate ${isDispensado ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>{it.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-mono font-bold ${isDispensado ? 'line-through text-neutral-500' : 'text-red-400'}`}>R$ {Number(it.price).toFixed(2)}</span>
                            <button type="button" onClick={() => toggleDispensarItem(it.id)} className="text-amber-400 p-1" title="Dispensar">{isDispensado ? '↺' : '✕'}</button>
                            <button type="button" onClick={() => removeItemFromForm(it.id)} className="text-neutral-500 hover:text-red-400 p-1"><X size={14} /></button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-neutral-400 uppercase">Total a Cobrar:</span>
                  <span className="text-base font-mono font-black text-red-500">R$ {calculatedTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="w-1/2 py-2.5 bg-neutral-800 text-neutral-300 text-xs font-bold uppercase rounded-xl">Cancelar</button>
                <button type="submit" className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg">Gravar Ordem</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black border border-neutral-300 w-full max-w-sm rounded-xl p-5 shadow-2xl font-mono text-xs space-y-3">
            <div className="text-center border-b pb-2">
              <h4 className="font-black text-sm uppercase">AUTOFLOW RACING</h4>
              <p className="text-[10px] text-neutral-600">COMPROVANTE DETALHADO DE SERVICO</p>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between"><span className="font-bold">ORDEM:</span><span>#{selectedReceipt.id}</span></div>
              <div className="flex justify-between"><span className="font-bold">PLACA:</span><span>{selectedReceipt.vehiclePlate}</span></div>
              <div className="flex justify-between"><span className="font-bold">VEICULO:</span><span>{selectedReceipt.vehicleModel}</span></div>
              <div className="flex justify-between"><span className="font-bold">CLIENTE:</span><span>{selectedReceipt.customerName}</span></div>
            </div>
            <div className="border-t border-dashed pt-2 space-y-1.5">
              <span className="font-bold block text-[10px] text-neutral-600 uppercase">ITENS / MAO DE OBRA:</span>
              {selectedReceipt.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span>{it.name}</span>
                  <span>R$ {Number(it.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-b py-2 flex justify-between font-bold text-sm">
              <span>TOTAL GERAL:</span>
              <span>R$ {Number(selectedReceipt.totalValue).toFixed(2)}</span>
            </div>
            <div className="flex gap-2 pt-1 print:hidden">
              <button onClick={() => setSelectedReceipt(null)} className="flex-1 py-1.5 bg-neutral-200 text-neutral-800 font-bold rounded-lg text-xs">Voltar</button>
              <button onClick={() => window.print()} className="flex-1 py-1.5 bg-black text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"><Printer size={13} /> Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;