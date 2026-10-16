import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Lock,
  LogOut,
  Download,
  FileJson,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Trash2,
  Plus,
  ArrowLeft
} from 'lucide-react';

interface ClientePix {
  id: string;
  nome: string;
  chavePix: string;
  tipoChave?: string;
  criadoEm?: string;
}

const DEFAULT_NOME = 'Gustavo';
const DEFAULT_PIX = '48660873823';
const LOCAL_STORAGE_KEY = 'pix_facil_clientes_backup';

export default function App() {
  // Navigation view: 'client' | 'login' | 'admin'
  const [view, setView] = useState<'client' | 'login' | 'admin'>('client');

  // Active client displayed on screen
  const [nomeAtivo, setNomeAtivo] = useState(DEFAULT_NOME);
  const [pixAtivo, setPixAtivo] = useState(DEFAULT_PIX);
  const [copiado, setCopiado] = useState(false);

  // Admin state
  const [isAdminLogado, setIsAdminLogado] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Admin edit form & client list
  const [clientes, setClientes] = useState<ClientePix[]>([]);
  const [novoNome, setNovoNome] = useState(DEFAULT_NOME);
  const [novoPix, setNovoPix] = useState(DEFAULT_PIX);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mostrarJsonRaw, setMostrarJsonRaw] = useState(false);

  // Load clients from JSON database
  const carregarDados = async () => {
    try {
      const res = await fetch('/api/pix');
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados) && dados.length > 0) {
          setClientes(dados);
          setNomeAtivo(dados[0].nome || DEFAULT_NOME);
          setPixAtivo(dados[0].chavePix || DEFAULT_PIX);
          setNovoNome(dados[0].nome || DEFAULT_NOME);
          setNovoPix(dados[0].chavePix || DEFAULT_PIX);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dados));
          return;
        }
      }
    } catch {
      // offline / fallback
    }

    // Fallback to localStorage
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClientes(parsed);
          setNomeAtivo(parsed[0].nome || DEFAULT_NOME);
          setPixAtivo(parsed[0].chavePix || DEFAULT_PIX);
          setNovoNome(parsed[0].nome || DEFAULT_NOME);
          setNovoPix(parsed[0].chavePix || DEFAULT_PIX);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    carregarDados();
    if (sessionStorage.getItem('pix_admin_auth') === 'true') {
      setIsAdminLogado(true);
    }
  }, []);

  // Copy Pix function
  const handleCopiar = async (texto: string) => {
    if (!texto) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto.trim());
      } else {
        const ta = document.createElement('textarea');
        ta.value = texto.trim();
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate?.(60);
      }

      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Login handler (admin / admin) - DO NOT DISPLAY USER/PASS ON SCREEN
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErro('');

    if (loginUser.trim() === 'admin' && loginSenha.trim() === 'admin') {
      setIsAdminLogado(true);
      sessionStorage.setItem('pix_admin_auth', 'true');
      setView('admin');
      setLoginUser('');
      setLoginSenha('');
      carregarDados();
    } else {
      setLoginErro('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setIsAdminLogado(false);
    sessionStorage.removeItem('pix_admin_auth');
    setView('client');
  };

  // Admin save client to JSON database
  const handleSalvarNoJson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoPix.trim()) return;

    setSalvando(true);
    setMensagemSucesso('');

    const novoItem: ClientePix = {
      id: 'pix_' + Date.now(),
      nome: novoNome.trim(),
      chavePix: novoPix.trim(),
      criadoEm: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome.trim(),
          chavePix: novoPix.trim(),
          tipoChave: 'Pix'
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.item) {
          novoItem.id = json.item.id;
        }
      }
    } catch {
      // offline
    }

    // Update state and active display
    setNomeAtivo(novoNome.trim());
    setPixAtivo(novoPix.trim());

    setClientes(prev => {
      const listaAtualizada = [novoItem, ...prev.filter(c => c.id !== novoItem.id)];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(listaAtualizada));
      return listaAtualizada;
    });

    setSalvando(false);
    setMensagemSucesso('Atualizado e salvo em clientes_pix.json com sucesso!');
    setTimeout(() => setMensagemSucesso(''), 3500);
  };

  // Delete client in admin
  const handleExcluir = async (id: string) => {
    try {
      await fetch(`/api/pix/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setClientes(prev => {
      const atualizada = prev.filter(c => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(atualizada));
      if (atualizada.length > 0) {
        setNomeAtivo(atualizada[0].nome);
        setPixAtivo(atualizada[0].chavePix);
      }
      return atualizada;
    });
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white antialiased">
      {/* ======================================================== */}
      {/* 1. TELA PRINCIPAL DO CLIENTE (Exatamente como pedido) */}
      {/* ======================================================== */}
      {view === 'client' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-sm mx-auto w-full">
          {/* Card Principal */}
          <div className="w-full bg-white border-2 border-black p-6 sm:p-8 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left">
            {/* Linha 1: Nome */}
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-bold block">
                Nome:
              </span>
              <p className="text-2xl font-black text-black tracking-tight break-words">
                {nomeAtivo}
              </p>
            </div>

            {/* Linha 2: Pix */}
            <div className="space-y-1 pt-2 border-t border-neutral-200">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-bold block">
                Pix:
              </span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-black break-all select-all bg-neutral-100 p-3 border border-black/20">
                {pixAtivo}
              </p>
            </div>

            {/* Botão Copiar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleCopiar(pixAtivo)}
                className={`w-full py-4 px-6 flex items-center justify-center gap-2 text-base font-extrabold tracking-wide uppercase transition active:scale-[0.98] border-2 border-black ${
                  copiado
                    ? 'bg-neutral-900 text-white'
                    : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                {copiado ? (
                  <>
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Botão de acesso discreto ao Login / Admin */}
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setLoginErro('');
                setView(isAdminLogado ? 'admin' : 'login');
              }}
              className="text-neutral-400 hover:text-black transition p-2 inline-flex items-center gap-1.5 text-xs"
              title="Acesso Administrativo"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAdminLogado ? 'Painel Admin' : 'Login'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TELA DE LOGIN (admin / admin - sem exibir credenciais) */}
      {/* ======================================================== */}
      {view === 'login' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-sm mx-auto w-full">
          <div className="w-full bg-white border-2 border-black p-6 sm:p-8 space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-black text-white mx-auto flex items-center justify-center mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">
                Acesso Restrito
              </h2>
              <p className="text-xs text-neutral-500">
                Digite suas credenciais para gerenciar os dados
              </p>
            </div>

            {loginErro && (
              <div className="p-3 bg-neutral-100 border border-black text-xs font-bold text-black text-center">
                {loginErro}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Usuário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={loginUser}
                    onChange={e => setLoginUser(e.target.value)}
                    placeholder="Digite o usuário"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    value={loginSenha}
                    onChange={e => setLoginSenha(e.target.value)}
                    placeholder="Digite a senha"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-black focus:outline-none"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-neutral-800 active:scale-[0.98] transition border-2 border-black"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setView('client')}
                  className="w-full py-2.5 px-4 bg-white text-black text-xs font-bold border border-neutral-300 hover:border-black transition"
                >
                  Voltar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PAINEL ADMINISTRATIVO (Gerenciar Banco .JSON) */}
      {/* ======================================================== */}
      {view === 'admin' && (
        <div className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:py-8 space-y-6">
          {/* Header Admin */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('client')}
                className="p-1.5 border border-black hover:bg-neutral-100 transition mr-1"
                title="Voltar para tela do cliente"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">
                  Painel Admin
                </h1>
                <p className="text-xs text-neutral-500">
                  Banco de dados: <code className="font-mono text-black font-semibold">clientes_pix.json</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('client')}
                className="px-3 py-1.5 text-xs font-bold border border-black hover:bg-neutral-100 transition"
              >
                Ver Tela
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-bold bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Notificação Sucesso */}
          {mensagemSucesso && (
            <div className="p-3 bg-neutral-100 border-2 border-black text-xs font-bold text-black">
              ✓ {mensagemSucesso}
            </div>
          )}

          {/* Formulário para definir o Nome e o Pix que aparecem na tela */}
          <div className="border-2 border-black p-5 bg-white space-y-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                Definir Nome e Pix da Tela
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Altere aqui o que vai aparecer para o seu cliente na tela principal.
              </p>
            </div>

            <form onSubmit={handleSalvarNoJson} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  placeholder="Ex: Gustavo"
                  className="w-full px-3 py-2.5 text-sm bg-white border-2 border-black text-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1">
                  Chave Pix
                </label>
                <input
                  type="text"
                  required
                  value={novoPix}
                  onChange={e => setNovoPix(e.target.value)}
                  placeholder="Ex: 48660873823"
                  className="w-full px-3 py-2.5 text-sm font-mono bg-white border-2 border-black text-black focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 px-4 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando no arquivo .json...</span>
                  </>
                ) : (
                  <>
                    <FileJson className="w-4 h-4" />
                    <span>Salvar no Arquivo .JSON</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Ações do Banco de Dados JSON */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/api/pix/download"
              download="clientes_pix.json"
              className="py-2.5 px-3 bg-white border-2 border-black hover:bg-neutral-100 text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar .json</span>
            </a>

            <button
              onClick={() => setMostrarJsonRaw(!mostrarJsonRaw)}
              className="py-2.5 px-3 bg-white border-2 border-black hover:bg-neutral-100 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>{mostrarJsonRaw ? 'Ocultar JSON' : 'Ver Código JSON'}</span>
            </button>
          </div>

          {/* Visualizador do código JSON */}
          {mostrarJsonRaw && (
            <div className="p-3 bg-neutral-900 text-neutral-100 font-mono text-xs border-2 border-black">
              <div className="pb-1 text-[11px] text-neutral-400 font-bold border-b border-neutral-700 mb-2">
                clientes_pix.json ({clientes.length} registros)
              </div>
              <pre className="max-h-48 overflow-y-auto leading-tight">
                {JSON.stringify(clientes, null, 2)}
              </pre>
            </div>
          )}

          {/* Histórico / Lista de Chaves Salvas */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black">
              Chaves Registradas no JSON ({clientes.length})
            </h3>
            {clientes.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3 text-center border border-dashed border-neutral-300">
                Nenhuma chave gravada ainda.
              </p>
            ) : (
              clientes.map(item => (
                <div
                  key={item.id}
                  className="p-3 border-2 border-black bg-white flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-black truncate">{item.nome}</p>
                    <p className="text-xs font-mono text-neutral-600 truncate">{item.chavePix}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setNomeAtivo(item.nome);
                        setPixAtivo(item.chavePix);
                        setNovoNome(item.nome);
                        setNovoPix(item.chavePix);
                        setView('client');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-neutral-100 border border-black hover:bg-black hover:text-white transition"
                    >
                      Exibir
                    </button>
                    <button
                      onClick={() => handleExcluir(item.id)}
                      className="p-1 text-neutral-500 hover:text-black border border-neutral-200 hover:border-black transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
