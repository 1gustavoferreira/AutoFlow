import React, { useState, useEffect, useMemo } from 'react';
import { Wrench, Plus, CheckCircle, Clock, Play, MessageCircle, Car, User, Trash2, RefreshCw, Search, Printer, X, CreditCard } from 'lucide-react';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1'
});

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
  createdAt?: string;
}

export function App() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ServiceOrder | null>(null);

  // Modal de Baixa de Pagamento
  const [finishingOrder, setFinishingOrder] = useState<ServiceOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [totalValue, setTotalValue] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      const data: ServiceOrder[] = res.data || [];
      const withPayments = data.map(o => ({
        ...o,
        paymentMethod: localStorage.getItem(`autoflow_pay_${o.id}`) || 'PIX'
      }));
      setOrders(withPayments);
    } catch (err) {
      console.error('Erro ao buscar ordens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        customerName,
        customerPhone,
        vehiclePlate,
        vehicleModel,
        serviceDescription,
        totalValue: parseFloat(totalValue) || 0
      });

      setShowModal(false);
      setCustomerName('');
      setCustomerPhone('');
      setVehiclePlate('');
      setVehicleModel('');
      setServiceDescription('');
      setTotalValue('');
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
    if (!confirm('Deseja realmente excluir esta Ordem de Serviço?')) return;
    try {
      await api.delete(`/orders/${id}`);
      localStorage.removeItem(`autoflow_pay_${id}`);
      fetchOrders();
    } catch (err: any) {
      alert('Erro ao excluir OS: ' + (err?.response?.data?.message || err.message));
    }
  };

  const openWhatsApp = (order: ServiceOrder) => {
    const text = encodeURIComponent(
      `Ola ${order.customerName}! Seu veiculo ${order.vehicleModel} (${order.vehiclePlate}) esta pronto para retirada no AutoFlow. Total: R$ ${Number(order.totalValue).toFixed(2)}.`
    );
    window.open(`https://wa.me/55${order.customerPhone}?text=${text}`, '_blank');
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

  const columns = [
    { key: 'AGUARDANDO', title: 'Fila / Aguardando', color: 'border-amber-500/30 text-amber-400', icon: Clock },
    { key: 'EM_ANDAMENTO', title: 'Em Execucao / Rampa', color: 'border-blue-500/30 text-blue-400', icon: Play },
    { key: 'FINALIZADO', title: 'Pronto / Finalizado', color: 'border-emerald-500/30 text-emerald-400', icon: CheckCircle },
  ] as const;

  const totalRevenue = orders
    .filter(o => o.status === 'FINALIZADO')
    .reduce((acc, o) => acc + Number(o.totalValue || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
            <Wrench size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AutoFlow
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                PDV & Oficina
              </span>
            </h1>
            <p className="text-xs text-slate-400">Gestão operacional e financeira em tempo real</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar placa, cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          <button
            onClick={fetchOrders}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition"
            title="Recarregar dados"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>

          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[9px] text-slate-500 uppercase block font-bold">Faturamento Total</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              R$ {totalRevenue.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition font-bold text-slate-950 text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <Plus size={15} />
            Nova OS
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {columns.map(col => {
          const ColIcon = col.icon;
          const colOrders = filteredOrders.filter(o => o.status === col.key);

          return (
            <div key={col.key} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-4 min-h-[520px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${col.color}`}>
                  <ColIcon size={14} />
                  {col.title}
                </span>
                <span className="text-xs font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-lg text-slate-300">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                {colOrders.map(order => (
                  <div key={order.id} className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition rounded-xl p-4 space-y-3 shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block">OS #{order.id}</span>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                          <Car size={14} className="text-slate-400" />
                          {order.vehicleModel}
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-black px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 tracking-wider">
                        {order.vehiclePlate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60">
                      {order.serviceDescription}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-900 pt-2">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-500" />
                        {order.customerName}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-white block">
                          R$ {Number(order.totalValue).toFixed(2)}
                        </span>
                        {order.status === 'FINALIZADO' && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {order.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      {order.status === 'AGUARDANDO' && (
                        <button
                          onClick={() => updateStatusDirect(order.id, 'EM_ANDAMENTO')}
                          className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Play size={12} /> Iniciar
                        </button>
                      )}

                      {order.status === 'EM_ANDAMENTO' && (
                        <button
                          onClick={() => {
                            setPaymentMethod('PIX');
                            setFinishingOrder(order);
                          }}
                          className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <CheckCircle size={12} /> Baixar / Receber
                        </button>
                      )}

                      {order.status === 'FINALIZADO' && (
                        <button
                          onClick={() => openWhatsApp(order)}
                          className="flex-1 py-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                        >
                          <MessageCircle size={13} /> Whats
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedReceipt(order)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Imprimir Comprovante"
                      >
                        <Printer size={13} />
                      </button>

                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Excluir OS"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {/* Modal Baixa e Forma de Pagamento */}
      {finishingOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-400" />
                Recebimento OS #{finishingOrder.id}
              </h3>
              <button onClick={() => setFinishingOrder(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Veículo:</span>
                <span className="text-white font-bold">{finishingOrder.vehicleModel}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Valor a Cobrar:</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">R$ {Number(finishingOrder.totalValue).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                {['PIX', 'Cartão Débito', 'Cartão Crédito', 'Dinheiro'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      paymentMethod === m
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setFinishingOrder(null)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmFinishWithPayment}
                className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 text-xs rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar / Imprimir Comprovante (OS) */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-300 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm">AUTOFLOW OFICINA</span>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-500 hover:text-black">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <p><strong>ORDEM DE SERVIÇO:</strong> #{selectedReceipt.id}</p>
              <p><strong>CLIENTE:</strong> {selectedReceipt.customerName}</p>
              <p><strong>TELEFONE:</strong> {selectedReceipt.customerPhone}</p>
              <p><strong>VEÍCULO:</strong> {selectedReceipt.vehicleModel}</p>
              <p><strong>PLACA:</strong> {selectedReceipt.vehiclePlate}</p>
              <p><strong>PAGAMENTO:</strong> {selectedReceipt.paymentMethod || 'Aberto'}</p>
              <p><strong>STATUS:</strong> {selectedReceipt.status}</p>
            </div>

            <div className="border-t border-dashed pt-2 space-y-1">
              <span className="font-bold block">DESCRIÇÃO DO SERVIÇO:</span>
              <p className="text-[11px] leading-relaxed">{selectedReceipt.serviceDescription}</p>
            </div>

            <div className="border-t border-b py-2 flex justify-between items-center text-sm font-bold">
              <span>TOTAL RECEBIDO:</span>
              <span>R$ {Number(selectedReceipt.totalValue).toFixed(2)}</span>
            </div>

            <p className="text-center text-[10px] text-slate-500">Obrigado pela preferência!</p>

            <div className="flex gap-2 pt-2 print:hidden">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Ordem */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Nova Ordem de Serviço</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-sm">Fechar</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cliente</label>
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="41999998888"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Placa</label>
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    value={vehiclePlate}
                    onChange={e => setVehiclePlate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono uppercase text-emerald-400 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Veículo / Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Saveiro 1.6"
                    value={vehicleModel}
                    onChange={e => setVehicleModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Descrição do Serviço</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Troca de pastilhas, lavagem completa, revisão..."
                  value={serviceDescription}
                  onChange={e => setServiceDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Valor Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalValue}
                  onChange={e => setTotalValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Salvar OS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;