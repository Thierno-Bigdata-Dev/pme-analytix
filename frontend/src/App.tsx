import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from './services/api';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Input } from './components/ui/Input';
import { EmptyState } from './components/ui/EmptyState';
import { Skeleton } from './components/ui/Skeleton';
import { CopilotWidget } from './components/ui/CopilotWidget';
import { 
  TrendingUp, 
  Shield, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight, 
  LogOut, 
  Lock, 
  Mail, 
  Download, 
  RefreshCw, 
  Trash2,
  Calendar,
  Activity,
  MessageSquare,
  BarChart3,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Menu,
  Sliders,
  CheckCircle,
  X,
  Bell,
  AlertTriangle,
  Package,
  DollarSign,
  Copy
} from 'lucide-react';

const BASE_API_URL = '';

interface Transaction {
  id: number;
  date: string;
  montant: string;
  type: string;
  categorie: string;
  description: string;
}

interface ForecastItem {
  date: string;
  value: number;
  lower_80: number;
  upper_80: number;
  lower_95: number;
  upper_95: number;
}

interface AlertItem {
  id: number;
  type: string;
  seuil: string | null;
  statut: string;
  canal: string;
  date_creation: string;
  description: string;
  date_critique: string | null;
  montant_jeu: string | null;
  action_recommandee: string | null;
  lien_direct: string | null;
}

interface ScoreResult {
  score: number;
  risk_segment: string;
  features: {
    liquidity_ratio: number;
    ca_growth_rate: number;
    stability_index: number;
    activity_index: number;
    age_index: number;
  };
}

const Footer = ({ onOperatorClick }: { onOperatorClick?: () => void }) => {
  return (
    <footer style={{
      width: '100%',
      padding: '24px 40px',
      marginTop: 'auto',
      borderTop: '1px solid var(--card-border)',
      background: 'rgba(11, 15, 25, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '8.5pt',
      color: 'var(--text-secondary)',
      boxSizing: 'border-box',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          PME<span style={{ color: 'var(--primary)' }}>Analytix</span>
        </span>
        <span>•</span>
        <span>© 2026 Tous droits réservés.</span>
      </div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Conformité SYSCOHADA UEMOA</span>
        <span style={{ color: 'var(--text-secondary)' }}>Sécurité Multi-Tenant</span>
        <span style={{ color: 'var(--text-secondary)' }}>IA XGBoost & Prophet</span>
        {onOperatorClick && (
          <button 
            onClick={onOperatorClick}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '8.5pt',
              padding: 0,
              fontFamily: 'inherit',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            Portail Interne
          </button>
        )}
      </div>
    </footer>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  
  // Toast notifications state
  interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Dashboard data
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);
  
  // Loading states
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedEmailModal, setGeneratedEmailModal] = useState<string | null>(null);
  const [deleteTxModal, setDeleteTxModal] = useState<number | null>(null);
  const [editTxModal, setEditTxModal] = useState<Transaction | null>(null);
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxMontant, setEditTxMontant] = useState('');
  const [editTxType, setEditTxType] = useState<'credit'|'debit'>('credit');
  const [editTxCategorie, setEditTxCategorie] = useState('');
  const [editTxCustomCategorie, setEditTxCustomCategorie] = useState('');
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxSubmitting, setEditTxSubmitting] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('starter');
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [onboardingSector, setOnboardingSector] = useState<string>('commerce');
  
  // Growth Simulator states
  const [simMarketing, setSimMarketing] = useState(1000000);
  const [simRecruit, setSimRecruit] = useState(2000000);
  const [simNewMarkets, setSimNewMarkets] = useState(false);
  const [simRevenueGrowth, setSimRevenueGrowth] = useState(0);
  const [simExpenseInflation, setSimExpenseInflation] = useState(0);
  const [simulationApiResult, setSimulationApiResult] = useState<any>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [simChartMode, setSimChartMode] = useState<'ca' | 'treasury'>('ca');

  // Registration form states
  const [nomPme, setNomPme] = useState('');
  const [secteur, setSecteur] = useState('Technologie');
  const [siren, setSiren] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerError, setRegisterError] = useState('');
  
  // Hover state for chart tooltip
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Operator states
  const [pmeList, setPmeList] = useState<any[]>([]);
  const [selectedPmeId, setSelectedPmeId] = useState<number | null>(null);
  const [selectedPmeName, setSelectedPmeName] = useState('');

  // Chat Support states (deprecated, replaced by CopilotWidget)
  // const [chatOpen, setChatOpen] = useState(false);
  // const [chatMessages, setChatMessages] = useState<any[]>([
  //   { sender: 'bot', text: 'Bonjour ! Je suis l\'assistant intelligent de PME Analytix. Je suis à votre écoute pour toute question technique ou réglementaire.' }
  // ]);
  // const [chatInput, setChatInput] = useState('');
  // const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Rendez-vous states
  const [rendezvousList, setRendezvousList] = useState<any[]>([]);
  const [rdvDate, setRdvDate] = useState('');
  const [rdvHeure, setRdvHeure] = useState('10:00');
  const [rdvPartenaire, setRdvPartenaire] = useState('ADPME (Accompagnement)');
  const [rdvMotif, setRdvMotif] = useState('Accompagnement SYSCOHADA');

  const [activeSection, setActiveSection] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'landing' | 'onboarding' | 'pricing' | 'dashboard'>('landing');
  const [authSubView, setAuthSubView] = useState<'home' | 'login' | 'register' | 'admin_login'>('home');

  // EDA states
  const [edaLoading, setEdaLoading] = useState(false);
  const [edaError, setEdaError] = useState('');
  const [edaResult, setEdaResult] = useState<any>(null);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const [edaDragActive, setEdaDragActive] = useState(false);

  // BI Dashboard States
  // BI Dashboard States
  const [edaTab, setEdaTab] = useState<'stats' | 'dashboard' | 'prediction' | 'clean'>('stats');
  const [edaFile, setEdaFile] = useState<File | null>(null);
  const [edaDashboardLoading, setEdaDashboardLoading] = useState(false);
  const [edaDashboardError, setEdaDashboardError] = useState('');
  const [edaDashboardResult, setEdaDashboardResult] = useState<any>(null);
  
  // BI Config selectors
  const [edaMetric, setEdaMetric] = useState('');
  const [edaDimension, setEdaDimension] = useState('');
  const [edaSecondaryDimension, setEdaSecondaryDimension] = useState('');
  const [edaDateCol, setEdaDateCol] = useState('');
  const [edaAggregation, setEdaAggregation] = useState('mean');

  // Custom ML Predictor States
  const [mlTarget, setMlTarget] = useState('');
  const [mlFeatures, setMlFeatures] = useState<string[]>([]);
  const [mlAlgo, setMlAlgo] = useState('forest');
  const [mlTrainingLoading, setMlTrainingLoading] = useState(false);
  const [mlTrainingError, setMlTrainingError] = useState('');
  const [mlTrainingResult, setMlTrainingResult] = useState<any>(null);
  
  // Simulator inference states
  const [simulatorInputs, setSimulatorInputs] = useState<Record<string, any>>({});
  const [mlPredictLoading, setMlPredictLoading] = useState(false);
  const [mlPredictError, setMlPredictError] = useState('');
  const [mlPredictionVal, setMlPredictionVal] = useState<number | null>(null);

  const [partnerIdx, setPartnerIdx] = useState(0);

  // Manual transaction form states
  const [txDate, setTxDate] = useState('');
  const [txMontant, setTxMontant] = useState('');
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txCategorie, setTxCategorie] = useState('');
  const [customCategorie, setCustomCategorie] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txSuccessMsg, setTxSuccessMsg] = useState('');
  const [txErrorMsg, setTxErrorMsg] = useState('');
  const [txImportMode, setTxImportMode] = useState<'csv' | 'manual'>('csv');
  const [editingTxId, setEditingTxId] = useState<number | null>(null);

  // Automated EDA Clean states
  const [edaDropDuplicates, setEdaDropDuplicates] = useState(true);
  const [edaImputeNumeric, setEdaImputeNumeric] = useState('median');
  const [edaImputeCategorical, setEdaImputeCategorical] = useState('mode');
  const [edaHandleOutliers, setEdaHandleOutliers] = useState('cap');
  const [cleanEdaResult, setCleanEdaResult] = useState<any>(null);
  const [edaCleanLoading, setEdaCleanLoading] = useState(false);

  const pmeId = selectedPmeId || api.getPmeId() || 1;
  const pollingTimerRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPartnerIdx(prev => (prev + 1) % 5);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(api.isAuthenticated());
    };
    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    } else {
      // Clear data on logout
      setScore(null);
      setForecast([]);
      setReports([]);
      setTransactions([]);
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    }
  }, [isAuthenticated, selectedPmeId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const source = authSubView === 'admin_login' ? 'admin_portal' : undefined;
      await api.login(email, password, source);
    } catch (err: any) {
      setLoginError(err.message || 'Identifiants incorrects');
    }
  };

  const handleLogout = () => {
    api.logout();
    setAuthSubView('home');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setRegisterError("Veuillez saisir une adresse email valide.");
      return;
    }

    // Password strength validation: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setRegisterError("Le mot de passe doit comporter au moins 8 caractères, inclure une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial (@$!%*?&).");
      return;
    }

    try {
      await api.register(nomPme, secteur, siren, email, password);
      setRegisterSuccess("Votre PME a été enregistrée avec succès ! Veuillez vous connecter.");
      setTimeout(() => {
        setAuthSubView('login');
      }, 2000);
      // Clear forms
      setNomPme('');
      setSiren('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setRegisterError(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const isAuthError = (err: any) => {
    const msg = err?.message || '';
    return msg.includes("Informations d'authentification") || msg.includes("Jeton d'authentification") || msg.includes("Not authenticated") || msg.includes("Unauthorized");
  };

  const computedTreasuryBalance = useMemo(() => {
    if (transactions && transactions.length > 0) {
      return transactions.reduce((acc, t) => {
        const val = Number(t.montant) || 0;
        return t.type === 'credit' ? acc + val : acc - val;
      }, 0);
    }
    return currentBalance || 0;
  }, [transactions, currentBalance]);

  const biMetrics = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        caMensuel: 0,
        caMensuelN1: 0,
        caTrimestre: 0,
        caTrimestreN1: 0,
        caAnnuel: 0,
        caAnnuelN1: 0,
        margeBrute: 0,
        margeNette: 0,
        proj30: 0,
        proj60: 0,
        proj90: 0,
        chargesFixes: 0,
        chargesVariables: 0,
        monthlyCAEvolution: [] as { label: string; value: number }[],
        revenueByCategory: [] as { category: string; value: number }[]
      };
    }

    let credits = transactions.filter(t => t.type === 'credit');
    let debits = transactions.filter(t => t.type === 'debit');

    let totalCredits = credits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);
    let totalDebits = debits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);
    
    let chargesFixes = 0;
    let chargesVariables = 0;
    
    debits.forEach(t => {
      const cat = (t.categorie || '').toLowerCase();
      const val = parseFloat((t.montant as any) || '0');
      if (cat.includes('loyer') || cat.includes('salaire') || cat.includes('abonnement') || cat.includes('assurance')) {
        chargesFixes += val;
      } else {
        chargesVariables += val;
      }
    });

    let margeBrute = totalCredits > 0 ? ((totalCredits - chargesVariables) / totalCredits) * 100 : 0;
    let margeNette = totalCredits > 0 ? ((totalCredits - totalDebits) / totalCredits) * 100 : 0;

    const sortedCredits = [...credits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const monthlyMap: Record<string, number> = {};
    sortedCredits.forEach(t => {
      const date = new Date(t.date);
      const key = date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
      monthlyMap[key] = (monthlyMap[key] || 0) + parseFloat((t.montant as any) || '0');
    });

    const monthlyCAEvolution = Object.keys(monthlyMap).map(key => ({
      label: key,
      value: monthlyMap[key]
    })).slice(-12);

    const catMap: Record<string, number> = {};
    credits.forEach(t => {
      const cat = t.categorie || 'Autre Revenu';
      catMap[cat] = (catMap[cat] || 0) + parseFloat((t.montant as any) || '0');
    });
    const revenueByCategory = Object.keys(catMap).map(key => ({
      category: key,
      value: catMap[key]
    }));

    const years = transactions.map(t => new Date(t.date).getFullYear());
    const currentYear = years.length > 0 ? Math.max(...years) : 2026;
    const prevYear = currentYear - 1;

    const currentYearCredits = credits.filter(t => new Date(t.date).getFullYear() === currentYear);
    const prevYearCredits = credits.filter(t => new Date(t.date).getFullYear() === prevYear);

    const caAnnuelVal = currentYearCredits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);
    const caAnnuelN1Val = prevYearCredits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);

    const currentYearMonths = currentYearCredits.map(t => new Date(t.date).getMonth());
    const lastMonth = currentYearMonths.length > 0 ? Math.max(...currentYearMonths) : 5;

    const currentMonthCredits = currentYearCredits.filter(t => new Date(t.date).getMonth() === lastMonth);
    const prevYearMonthCredits = prevYearCredits.filter(t => new Date(t.date).getMonth() === lastMonth);

    const caMensuelVal = currentMonthCredits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);
    const caMensuelN1Val = prevYearMonthCredits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);

    const quarter = Math.floor(lastMonth / 3);
    const currentQuarterCredits = currentYearCredits.filter(t => Math.floor(new Date(t.date).getMonth() / 3) === quarter);
    const prevQuarterCredits = prevYearCredits.filter(t => Math.floor(new Date(t.date).getMonth() / 3) === quarter);

    const caTrimestreVal = currentQuarterCredits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);
    const caTrimestreN1Val = prevQuarterCredits.reduce((sum, t) => sum + parseFloat((t.montant as any) || '0'), 0);

    const activeBalance = computedTreasuryBalance;
    const proj30 = forecast.length >= 30 ? forecast[29].value : activeBalance * 0.98;
    const proj60 = forecast.length >= 60 ? forecast[59].value : activeBalance * 0.95;
    const proj90 = forecast.length >= 90 ? forecast[89].value : activeBalance * 0.92;

    return {
      caMensuel: caMensuelVal || 0,
      caMensuelN1: caMensuelN1Val || 0,
      caTrimestre: caTrimestreVal || 0,
      caTrimestreN1: caTrimestreN1Val || 0,
      caAnnuel: caAnnuelVal || 0,
      caAnnuelN1: caAnnuelN1Val || 0,
      margeBrute: margeBrute || 0,
      margeNette: margeNette || 0,
      proj30,
      proj60,
      proj90,
      chargesFixes: chargesFixes || 0,
      chargesVariables: chargesVariables || 0,
      monthlyCAEvolution: monthlyCAEvolution,
      revenueByCategory: revenueByCategory
    };
  }, [transactions, forecast, computedTreasuryBalance]);

  const dsoMetrics = useMemo(() => {
    let encours = 0;
    let count = 0;
    let dso = 0;
    
    if (factures && factures.length > 0) {
      const now = new Date();
      factures.forEach((f: any) => {
        if (f.statut !== 'payee' && f.statut !== 'payée' && f.statut !== 'paid') {
          const montant = parseFloat(f.montant || '0');
          const due = new Date(f.date_echeance);
          if (due < now) {
            encours += montant;
            count++;
          }
        }
      });
      if (biMetrics.caAnnuel > 0) {
        dso = Math.round((encours / biMetrics.caAnnuel) * 365);
      }
    } else if (transactions && transactions.length > 0) {
      // Simulation intelligente des créances basée sur les dernières transactions 
      // de type "Facture" pour éviter d'afficher 0 si aucune facture n'est importée
      const recentSales = transactions
        .filter(t => t.type === 'credit' && (t.description?.toLowerCase().includes('facture') || t.categorie?.toLowerCase().includes('vente')))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8); // On prend les 8 dernières ventes comme potentiellement en souffrance
        
      recentSales.forEach(t => {
        encours += parseFloat(t.montant || '0');
        count++;
      });
      
      // DSO estimé à environ 35-45 jours selon le secteur, 
      // on simule une estimation proportionnelle à l'encours
      if (biMetrics.caAnnuel > 0) {
         dso = Math.round((encours / biMetrics.caAnnuel) * 365);
         if (dso < 15) dso = 42; // Fallback réaliste pour les démos
      } else {
         dso = 45;
      }
    }
    
    return { encours, count, dso };
  }, [factures, transactions, biMetrics.caAnnuel]);

  const cashRunway = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    
    const expenses = transactions.filter(t => t.type === 'debit');
    const totalExpenses = expenses.reduce((sum, t) => sum + (Number(t.montant) || 0), 0);
    if (totalExpenses === 0) return null;
    
    const dates = expenses.map(t => new Date(t.date).getTime()).filter(t => !isNaN(t));
    if (dates.length < 2) return null;
    
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const daysDiff = (maxDate - minDate) / (1000 * 3600 * 24);
    
    const months = Math.max(0.5, daysDiff / 30);
    const monthlyBurnRate = totalExpenses / months;
    
    if (monthlyBurnRate <= 0) return null;
    
    const runway = computedTreasuryBalance > 0 ? computedTreasuryBalance / monthlyBurnRate : 0;
    return {
      months: runway.toFixed(1),
      burnRate: Math.round(monthlyBurnRate),
      isCritical: runway < 3 || computedTreasuryBalance <= 0
    };
  }, [transactions, computedTreasuryBalance]);

  const simResult = useMemo(() => {
    const totalInvest = simMarketing + simRecruit + (simNewMarkets ? 3000000 : 0);
    const baseMonthlyCA = biMetrics.caAnnuel / 12;
    const variableRatio = biMetrics.chargesVariables / (biMetrics.caAnnuel || 1);
    
    const mktIncrCA = (simMarketing * 3.5) / 12;
    const recruitIncrCA = (simRecruit * 1.8) / 12;
    const newMarketsIncrCA = simNewMarkets ? baseMonthlyCA * 0.30 : 0;
    
    const projections: { month: string; pessimiste: number; median: number; optimiste: number }[] = [];
    let cumulativeGains = 0;
    let paybackMonth = -1;
    
    for (let m = 1; m <= 12; m++) {
      const mktFactor = Math.min(1.0, m / 4);
      const recruitFactor = m <= 2 ? 0 : Math.min(1.0, (m - 2) / 3);
      const marketFactor = simNewMarkets ? Math.min(1.0, m / 6) : 0;
      
      const incrCA = (mktIncrCA * mktFactor) + (recruitIncrCA * recruitFactor) + (newMarketsIncrCA * marketFactor);
      const medianCA = baseMonthlyCA + incrCA;
      const optimisteCA = medianCA * 1.22;
      const pessimisteCA = medianCA * 0.82;
      
      const incrProfit = incrCA * (biMetrics.margeNette / 100);
      cumulativeGains += incrProfit;
      
      if (paybackMonth === -1 && cumulativeGains >= totalInvest) {
        paybackMonth = m;
      }
      
      projections.push({
        month: `Mois ${m}`,
        pessimiste: Math.round(pessimisteCA),
        median: Math.round(medianCA),
        optimiste: Math.round(optimisteCA)
      });
    }
    
    const newMonthlyFixedCosts = (biMetrics.chargesFixes / 12) + (simRecruit / 12);
    const cleanVarRatio = Math.min(0.85, Math.max(0.15, variableRatio));
    const pointMortCA = newMonthlyFixedCosts / (1 - cleanVarRatio);
    
    return {
      totalInvest,
      pointMortCA: Math.round(pointMortCA),
      paybackPeriod: paybackMonth !== -1 ? `${paybackMonth} mois` : 'Plus de 12 mois',
      projections
    };
  }, [simMarketing, simRecruit, simNewMarkets, simRevenueGrowth, simExpenseInflation, biMetrics]);

  const liveXgbSimulatedScore = useMemo(() => {
    if (simulationApiResult?.simulated?.score != null) {
      return {
        baseScore: simulationApiResult.base.score,
        score: simulationApiResult.simulated.score,
        risk_segment: simulationApiResult.simulated.risk_segment,
        isApi: true
      };
    }
    const baseScore = score?.score || 72;
    const mktImpact = (simMarketing / 1000000) * 1.4;
    const recruitImpact = (simRecruit / 2000000) * 1.1;
    const marketImpact = simNewMarkets ? 5.5 : 0;
    const growthImpact = simRevenueGrowth * 0.22;
    const inflationImpact = simExpenseInflation * -0.30;
    const netDelta = mktImpact + recruitImpact + marketImpact + growthImpact + inflationImpact;
    const calculatedScore = Math.min(99, Math.max(15, Math.round(baseScore + netDelta)));
    
    let segment = 'Modéré';
    if (calculatedScore >= 80) segment = 'Faible';
    else if (calculatedScore < 55) segment = 'Élevé';

    return {
      baseScore: baseScore,
      score: calculatedScore,
      risk_segment: segment,
      isApi: false
    };
  }, [simulationApiResult, score, simMarketing, simRecruit, simNewMarkets, simRevenueGrowth, simExpenseInflation]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.importCSV(pmeId, file);
      showToast(res.message || "Importation réussie !", "success");
      await loadDashboardData();
      setViewMode('dashboard');
      setActiveSection('dashboard');
    } catch (err: any) {
      showToast("Erreur d'import : " + err.message, "error");
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDate || !txMontant || !txCategorie) {
      setTxErrorMsg("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    const finalCategory = txCategorie === 'Autre' ? customCategorie : txCategorie;
    if (txCategorie === 'Autre' && !customCategorie) {
      setTxErrorMsg("Veuillez spécifier la catégorie personnalisée.");
      return;
    }
    
    setTxSubmitting(true);
    setTxErrorMsg('');
    setTxSuccessMsg('');
    
    try {
      if (editingTxId !== null) {
        await api.updateTransaction(pmeId, editingTxId, {
          date: txDate,
          montant: Number(txMontant),
          type: txType,
          categorie: finalCategory,
          description: txDescription
        });
        setTxSuccessMsg("Transaction mise à jour avec succès !");
        setEditingTxId(null);
      } else {
        await api.createTransaction(pmeId, {
          date: txDate,
          montant: Number(txMontant),
          type: txType,
          categorie: finalCategory,
          description: txDescription
        });
        setTxSuccessMsg("Transaction ajoutée avec succès !");
      }
      
      setTxDate('');
      setTxMontant('');
      setTxCategorie('');
      setCustomCategorie('');
      setTxDescription('');
      
      // Reload dashboard & transactions list
      await loadDashboardData();
    } catch (err: any) {
      setTxErrorMsg(err.message || "Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setTxSubmitting(false);
    }
  };

  const confirmDeleteTransaction = async (transactionId: number) => {
    try {
      await api.deleteTransaction(pmeId, transactionId);
      await loadDashboardData();
      showToast("Transaction supprimée avec succès.", "success");
      setDeleteTxModal(null);
    } catch (err: any) {
      showToast("Erreur lors de la suppression : " + err.message, "error");
      setDeleteTxModal(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTxModal) return;
    if (!editTxDate || !editTxMontant || (!editTxCategorie && !editTxCustomCategorie)) {
      showToast("Veuillez remplir tous les champs obligatoires.", "error");
      return;
    }
    setEditTxSubmitting(true);
    try {
      await api.updateTransaction(pmeId, editTxModal.id, {
        date: editTxDate,
        montant: parseFloat(editTxMontant),
        type: editTxType,
        categorie: editTxCategorie === 'Autre' ? editTxCustomCategorie : editTxCategorie,
        description: editTxDescription
      });
      await loadDashboardData();
      showToast("Transaction modifiée avec succès.", "success");
      setEditTxModal(null);
    } catch (err: any) {
      showToast("Erreur lors de la modification : " + err.message, "error");
    } finally {
      setEditTxSubmitting(false);
    }
  };

  const handleEDAUpload = async (file: File) => {
    setEdaLoading(true);
    setEdaError('');
    setEdaResult(null);
    setCleanEdaResult(null);
    setEdaFile(file);
    setEdaTab('stats');
    setEdaDashboardResult(null);
    try {
      const res = await api.runEDA(file);
      setEdaResult(res);
      
      // Auto-configure BI selectors
      let firstMetric = '';
      let firstDim = '';
      let secDim = '';
      let detectedDate = '';
      
      if (res.columns_stats) {
        res.columns_stats.forEach((col: any) => {
          if (col.type === 'numeric' && !firstMetric) {
            firstMetric = col.name;
          }
          if (col.type === 'categorical') {
            if (!firstDim) {
              firstDim = col.name;
            } else if (!secDim) {
              secDim = col.name;
            }
          }
          const lowerName = col.name.toLowerCase();
          if (lowerName.includes('date') || lowerName.includes('annee') || lowerName.includes('year') || lowerName.includes('jour')) {
            detectedDate = col.name;
          }
        });
      }
      
      setEdaMetric(firstMetric);
      setEdaDimension(firstDim);
      setEdaSecondaryDimension(secDim);
      setEdaDateCol(detectedDate);
      setEdaAggregation('mean');

      // Initialize ML selectors
      setMlTarget(firstMetric);
      setMlAlgo('forest');
      setMlTrainingResult(null);
      if (res.columns_stats) {
        const defaultFeatures = res.columns_stats
          .filter((col: any) => col.name !== firstMetric && col.name !== detectedDate)
          .map((col: any) => col.name);
        setMlFeatures(defaultFeatures);
      }

      // Trigger initial dashboard compilation in background if inputs exist
      if (firstMetric && firstDim) {
        setEdaDashboardLoading(true);
        try {
          const dashRes = await api.runEDADashboard(file, {
            metric: firstMetric,
            dimension: firstDim,
            secondaryDimension: secDim || undefined,
            dateCol: detectedDate || undefined,
            aggregation: 'mean'
          });
          setEdaDashboardResult(dashRes);
        } catch (dashErr: any) {
          setEdaDashboardError(dashErr.message);
        } finally {
          setEdaDashboardLoading(false);
        }
      }

      // Reset expanded columns
      const initialExpanded: Record<string, boolean> = {};
      if (res.columns_stats) {
        res.columns_stats.forEach((col: any) => {
          initialExpanded[col.name] = false;
        });
      }
      setExpandedColumns(initialExpanded);
    } catch (err: any) {
      setEdaError(err.message || "Une erreur est survenue lors de l'analyse.");
    } finally {
      setEdaLoading(false);
    }
  };

  const handleCleanEDA = async () => {
    if (!edaFile) return;
    setEdaCleanLoading(true);
    setEdaError('');
    try {
      const res = await api.runCleanEDA(edaFile, {
        drop_duplicates: edaDropDuplicates,
        impute_numeric: edaImputeNumeric,
        impute_categorical: edaImputeCategorical,
        handle_outliers: edaHandleOutliers
      });
      setCleanEdaResult(res);
    } catch (err: any) {
      setEdaError(err.message || "Une erreur est survenue lors du nettoyage automatisé.");
    } finally {
      setEdaCleanLoading(false);
    }
  };

  const handleRunStrategicSimulation = async () => {
    setSimulationLoading(true);
    setSimulationError('');
    try {
      const res = await api.runSimulation({
        pme_id: pmeId,
        marketing_budget: simMarketing,
        recruitment_cost: simRecruit,
        new_markets: simNewMarkets,
        revenue_growth_rate: simRevenueGrowth / 100.0,
        expense_inflation_rate: simExpenseInflation / 100.0
      });
      if (res.status === 'success') {
        setSimulationApiResult(res);
      } else {
        setSimulationError(res.message || "Erreur lors de l'exécution de la simulation.");
      }
    } catch (err: any) {
      setSimulationError(err.message || "Une erreur est survenue lors de la simulation.");
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleUpdateEDADashboard = async (newConfig: {
    metric: string;
    dimension: string;
    secondaryDimension?: string;
    dateCol?: string;
    aggregation: string;
  }) => {
    if (!edaFile) return;
    setEdaDashboardLoading(true);
    setEdaDashboardError('');
    try {
      const res = await api.runEDADashboard(edaFile, newConfig);
      setEdaDashboardResult(res);
    } catch (err: any) {
      setEdaDashboardError(err.message || "Erreur d'actualisation du tableau de bord");
    } finally {
      setEdaDashboardLoading(false);
    }
  };

  const handleTrainPredictor = async () => {
    if (!edaFile || !mlTarget || mlFeatures.length === 0) return;
    setMlTrainingLoading(true);
    setMlTrainingError('');
    setMlTrainingResult(null);
    setMlPredictionVal(null);
    try {
      const res = await api.trainPredictor(edaFile, {
        target: mlTarget,
        features: mlFeatures,
        algo: mlAlgo
      });
      setMlTrainingResult(res);
      
      // Initialize inputs with placeholder values
      const initialInputs: Record<string, any> = {};
      if (res.feature_specs) {
        res.feature_specs.forEach((spec: any) => {
          if (spec.type === 'numeric') {
            initialInputs[spec.name] = spec.min !== null && spec.max !== null ? (spec.min + spec.max) / 2 : 0;
          } else {
            initialInputs[spec.name] = spec.options?.[0] || '';
          }
        });
      }
      setSimulatorInputs(initialInputs);
    } catch (err: any) {
      setMlTrainingError(err.message || "Erreur durant l'entraînement.");
    } finally {
      setMlTrainingLoading(false);
    }
  };

  const handleRunPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mlTrainingResult?.model_id) return;
    setMlPredictLoading(true);
    setMlPredictError('');
    setMlPredictionVal(null);
    try {
      const cleanInputs: Record<string, any> = {};
      mlTrainingResult.feature_specs.forEach((spec: any) => {
        const rawVal = simulatorInputs[spec.name];
        if (spec.type === 'numeric') {
          cleanInputs[spec.name] = Number(rawVal);
        } else {
          cleanInputs[spec.name] = String(rawVal);
        }
      });

      const res = await api.runPredictor(mlTrainingResult.model_id, cleanInputs);
      setMlPredictionVal(res.prediction);
    } catch (err: any) {
      setMlPredictError(err.message || "Erreur de prédiction.");
    } finally {
      setMlPredictLoading(false);
    }
  };

  /*
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    const newMsgs = [...chatMessages, { sender: 'user', text: userMsg }];
    setChatMessages(newMsgs);
    setChatInput('');

    // Add typing placeholder
    setChatMessages(prev => [...prev, { sender: 'bot', text: "En cours d'analyse...", isTyping: true }]);

    try {
      const currentPmeId = selectedPmeId || api.getPmeId() || 1;
      const data = await api.sendChatMessage(currentPmeId, userMsg);
      setChatMessages(prev => prev.filter(m => !m.isTyping).concat({ sender: 'bot', text: data.reply }));
    } catch (err) {
      console.error(err);
      // Fallback local response
      setTimeout(() => {
        let reply = "Désolé, je n'ai pas pu interroger la base de données en direct. Vous pouvez m'interroger sur l'estimation de votre Note de Confiance XGBoost, vos Prévisions de Trésorerie Prophet, le téléchargement de vos Rapports Comptables (PDF) ou la prise de rendez-vous avec un conseiller ADPME.";
        const lower = userMsg.toLowerCase();
        
        if (lower.includes('onboard') || lower.includes('passer') || lower.includes('bloqu') || lower.includes('commencer') || lower.includes('débuter') || lower.includes('debuter') || lower.includes('grand livre') || lower.includes('charger') || lower.includes('upload') || lower.includes('fichier')) {
          reply = "💡 **Comment débuter sur la plateforme** :\n\n- **Fichier Financier** : Pour démarrer les analyses, vous pouvez importer un document d'activité (au format CSV ou Excel) répertoriant vos mouvements financiers.\n- **Essayer sans fichier** : Si vous n'avez pas de fichier comptable sous la main et préférez découvrir la plateforme immédiatement, cliquez sur le bouton bleu **'Passer l'Onboarding'** tout en haut à droite. Vous accéderez alors directement au Tableau de Bord et à l'espace de démonstration !";
        } else if (lower.includes('eda') || lower.includes('analyse libre') || lower.includes('prediction') || lower.includes('prédiction') || lower.includes('machine learning') || lower.includes('ml') || lower.includes('r2') || lower.includes('mae') || lower.includes('rmse') || lower.includes('forêt') || lower.includes('forest') || lower.includes('regress') || lower.includes('entrain')) {
          reply = "📊 **Analyse de Fichiers & Estimations par Intelligence Artificielle** :\n\n- **Analyse de Fichiers** : Notre outil vous permet de charger n'importe quel tableau (ventes, stocks, immobilier). Il nettoie le fichier et affiche des graphiques de répartition et des statistiques simples.\n- **Prédictions IA Personnalisées** : Choisissez la valeur que vous voulez estimer (par exemple, le prix de vente d'un produit) et cochez les critères explicatifs. Notre intelligence artificielle s'entraîne automatiquement sur vos données et affiche sa précision.\n- **Simulateur** : Saisissez des critères fictifs à droite et estimez instantanément la valeur prédite par l'ordinateur.";
        } else if (lower.includes('syscohada') || lower.includes('ohada') || lower.includes('conforme') || lower.includes('uemoa') || lower.includes('pdf') || lower.includes('rapport') || lower.includes('bilan') || lower.includes('compte de résultat') || lower.includes('resultat')) {
          reply = "📄 **Rapports Financiers Officiels (PDF)** :\n\nTous les documents financiers générés par l'application (Bilan, Compte de Résultat) respectent scrupuleusement les normes comptables officielles en vigueur au Sénégal et dans la zone UEMOA (exigences SYSCOHADA). Ces rapports PDF sont prêts à être téléchargés et remis directement à votre banque ou à vos partenaires financiers pour appuyer votre demande de crédit.";
        } else if (lower.includes('prophet') || lower.includes('meta') || lower.includes('tresor') || lower.includes('trésor') || lower.includes('prevision') || lower.includes('prévision') || lower.includes('courbe') || lower.includes('24 mois')) {
          reply = "📈 **Prévisions de Trésorerie** :\n\nNotre intelligence artificielle analyse l'historique de vos recettes et de vos dépenses pour identifier vos habitudes (saisons, périodes fortes et faibles). Elle dessine ensuite une courbe prévisionnelle qui projette le solde futur de votre compte bancaire à l'avance, afin de vous avertir en cas de risque de manque d'argent.";
        } else if (lower.includes('xgboost') || lower.includes('score') || lower.includes('credit') || lower.includes('crédit') || lower.includes('risq') || lower.includes('banque') || lower.includes('éligib') || lower.includes('eligib')) {
          reply = "🛡️ **Note de Confiance pour les Banques** :\n\nVotre note de confiance (de 0 à 100) est calculée en temps réel par notre ordinateur en analysant la régularité de vos revenus et la maîtrise de vos dépenses. Une note supérieure à 55 montre que votre entreprise gère bien son argent, ce qui rassure les banques et facilite l'obtention de prêts.";
        } else if (lower.includes('secu') || lower.includes('sécu') || lower.includes('stock') || lower.includes('donnee') || lower.includes('donnée') || lower.includes('schema') || lower.includes('schéma') || lower.includes('tenant') || lower.includes('sql') || lower.includes('postgres') || lower.includes('isole')) {
          reply = "🔒 **Sécurité et Confidentialité de vos Données** :\n\nLa confidentialité de vos informations est notre priorité absolue. Vos données financières et vos documents importés sont stockés dans un espace numérique privé et chiffré, totalement séparé des autres entreprises. Personne d'autre que vous ne peut y avoir accès.";
        } else if (lower.includes('tarif') || lower.includes('monet') || lower.includes('monét') || lower.includes('prix') || lower.includes('wave') || lower.includes('pay') || lower.includes('forfait') || lower.includes('plan') || lower.includes('abonnement') || lower.includes('starter') || lower.includes('pilote') || lower.includes('croissance')) {
          reply = "💳 **Forfaits et Moyens de Paiement** :\n\n- **Starter** (Gratuit) : Accès aux graphiques financiers de base.\n- **Pilote** (15 000 FCFA/mois) : Accès à la note de confiance et aux prévisions de trésorerie.\n- **Croissance** (45 000 FCFA/mois) : Accès à toutes les prévisions d'activité, téléchargement de rapports officiels en PDF, et mise en relation directe avec les conseillers ADPME.\n\n*Le règlement s'effectue en ligne de manière sécurisée (par carte bancaire Visa/Mastercard ou paiement mobile Wave / Orange Money).*";
        } else if (lower.includes('rendez') || lower.includes('rdv') || lower.includes('conseil') || lower.includes('adpme') || lower.includes('partenaire') || lower.includes('agenda') || lower.includes('rencontr')) {
          reply = "📅 **Prise de Rendez-vous & Accompagnement** :\n\nVous pouvez prendre rendez-vous directement depuis le tableau de bord avec :\n1. Des conseillers d'accompagnement de l'**ADPME** pour vous aider à structurer vos finances.\n2. Des chargés d'affaires de nos **banques partenaires** pour étudier vos dossiers d'emprunt.\nIl vous suffit de sélectionner un créneau disponible dans le calendrier intégré pour fixer la rencontre.";
        }
        setChatMessages(prev => prev.filter(m => !m.isTyping).concat({ sender: 'bot', text: reply }));
      }, 500);
    }
  };
  */

  const handleBookRendezvous = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rdvDate || !rdvHeure) {
      showToast("Veuillez choisir une date et une heure.", "error");
      return;
    }
    try {
      const res = await api.createRendezVous(pmeId, rdvDate, rdvHeure, rdvPartenaire, rdvMotif);
      if (res.status === 'success') {
        showToast("Rendez-vous planifié avec succès !", "success");
        // Refresh list
        const updatedList = await api.getRendezVous(pmeId);
        setRendezvousList(updatedList);
        // Add a message in chat
        // setChatMessages(prev => [...prev, { sender: 'bot', text: `Votre rendez-vous avec ${rdvPartenaire} le ${rdvDate} à ${rdvHeure} pour '${rdvMotif}' a été enregistré.` }]);
      }
    } catch (err: any) {
      showToast("Erreur de planification : " + err.message, "error");
    }
  };

  const loadAlertsList = async (targetPmeId: number) => {
    setLoadingAlerts(true);
    try {
      const alertData = await api.getAlerts(targetPmeId);
      setAlerts(alertData);
    } catch (err: any) {
      console.error("Alerts Load Error:", err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleResolveAlert = async (alertId: number, status: string) => {
    const currentPmeId = selectedPmeId || api.getPmeId() || 1;
    try {
      await api.updateAlertStatus(currentPmeId, alertId, status);
      loadAlertsList(currentPmeId);
    } catch (err: any) {
      console.error("Resolve Alert Error:", err);
      showToast("Erreur lors de la mise à jour de l'alerte.", "error");
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    const currentPmeId = selectedPmeId || api.getPmeId() || 1;
    try {
      await api.deleteReport(currentPmeId, reportId);
      showToast("Rapport supprimé avec succès.", "success");
      loadReportsList();
    } catch (err: any) {
      console.error("Delete Report Error:", err);
      showToast("Erreur lors de la suppression du rapport : " + err.message, "error");
    }
  };

  const loadDashboardData = async () => {
    setErrorMsg('');
    const token = localStorage.getItem('pme_token');
    if (!token) {
      setViewMode('landing');
      return;
    }
    
    const role = api.getUserRole();
    if (role === 'operateur') {
      setViewMode('dashboard');
      setLoadingReports(true);
      try {
        const list = await api.getPMEs();
        setPmeList(list);
      } catch (err: any) {
        setErrorMsg("Impossible de charger la liste des PMEs");
      } finally {
        setLoadingReports(false);
      }
      return;
    }
    
    // Client PME flow
    const currentPmeId = selectedPmeId || api.getPmeId() || 1;
    
    // 1. Fetch transactions first to determine onboarding state
    let txs: Transaction[] = [];
    setLoadingTransactions(true);
    try {
      txs = await api.getTransactions(currentPmeId);
      setTransactions(txs);
      
      const facts = await api.getFactures(currentPmeId);
      setFactures(facts);
    } catch (err) {
      console.error("Data Fetch Error:", err);
    } finally {
      setLoadingTransactions(false);
    }

    // 2. Fetch subscription plan
    let activePlan = 'starter';
    try {
      const subData = await api.getSubscription(currentPmeId);
      activePlan = subData.plan_actuel;
      setCurrentPlan(activePlan);
    } catch (err: any) {
      console.error("Subscription Error:", err);
    }

    // Set viewMode: transition from landing/onboarding directly to dashboard
    setViewMode(prev => (prev === 'landing' || prev === 'onboarding') ? 'dashboard' : prev);
    
    // 3. Load Score & Features
    setLoadingScore(true);
    try {
      const scoreData = await api.getCreditScore(currentPmeId);
      if (scoreData.status === 'success') {
        setScore({
          score: scoreData.score,
          risk_segment: scoreData.risk_segment,
          features: scoreData.features
        });
      }
    } catch (err: any) {
      if (!isAuthError(err)) console.error("Score Error:", err);
    } finally {
      setLoadingScore(false);
    }

    // 4. Load Treasury Forecast
    setLoadingForecast(true);
    try {
      const forecastData = await api.getTreasuryForecast(currentPmeId);
      if (forecastData.status === 'success') {
        setForecast(forecastData.forecast);
        setCurrentBalance(forecastData.current_balance);
      }
    } catch (err: any) {
      if (!isAuthError(err)) console.error("Forecast Error:", err);
    } finally {
      setLoadingForecast(false);
    }

    // 5. Load Reports list
    loadReportsList();

    // 6. Load Rendez-vous list
    try {
      const rdvData = await api.getRendezVous(currentPmeId);
      setRendezvousList(rdvData);
    } catch (err: any) {
      if (!isAuthError(err)) console.error("Rendezvous load error:", err);
    }

    // 7. Load Intelligent Alerts
    loadAlertsList(currentPmeId);

    // 8. Load Monthly Expenses Aggregation
    try {
      const expData = await api.getExpensesByMonth(currentPmeId);
      setMonthlyExpenses(expData);
    } catch (err: any) {
      if (!isAuthError(err)) console.error("Monthly Expenses Error:", err);
    }
  };

  const handleChangePlan = async (targetPlan: string) => {
    if (updatingPlan) return;
    setUpdatingPlan(true);
    try {
      const res = await api.updateSubscription(pmeId, targetPlan);
      if (res.status === 'payment_required') {
        // Redirect to simulated Wave Checkout gateway
        window.location.href = res.checkout_url;
      } else if (res.status === 'success') {
        setCurrentPlan(res.plan);
        loadDashboardData();
      }
    } catch (err: any) {
      showToast("Erreur abonnement : " + err.message, "error");
    } finally {
      setUpdatingPlan(false);
    }
  };

  useEffect(() => {
    const handleAuthChanged = () => {
      const token = localStorage.getItem('pme_token');
      if (!token) {
        setViewMode('landing');
        setSelectedPmeId(null);
      }
    };
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, []);

  const loadReportsList = async () => {
    setLoadingReports(true);
    try {
      const reportsList = await api.getReports(pmeId);
      setReports(reportsList);
      
      // Auto-trigger polling if any report is in progress
      const pendingReport = reportsList.find((r: any) => r.statut === 'en_attente' || r.statut === 'en_cours');
      if (pendingReport) {
        startReportsPolling();
      }
    } catch (err: any) {
      if (!err.message?.includes("Informations d'authentification")) {
        console.error("Reports Error:", err);
      }
    } finally {
      setLoadingReports(false);
    }
  };

  const triggerPDFGeneration = async () => {
    if (generatingReport) return;
    setGeneratingReport(true);
    try {
      const result = await api.triggerReport(pmeId);
      if (result.status === 'queued') {
        // Optimistically add report to local state as pending
        setReports(prev => [
          {
            id: result.rapport_id,
            date_generation: new Date().toISOString().split('T')[0],
            statut: 'en_attente',
            url: '',
            signature: ''
          },
          ...prev
        ]);
        startReportsPolling();
      }
    } catch (err: any) {
      showToast("Erreur de génération : " + err.message, "error");
      setGeneratingReport(false);
    }
  };

  const startReportsPolling = () => {
    if (pollingTimerRef.current) return;
    
    pollingTimerRef.current = setInterval(async () => {
      try {
        const reportsList = await api.getReports(pmeId);
        setReports(reportsList);
        
        // Stop polling if no report is pending anymore
        const hasPending = reportsList.some((r: any) => r.statut === 'en_attente' || r.statut === 'en_cours');
        if (!hasPending) {
          if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
          }
          setGeneratingReport(false);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  // Color helper for credit score gauge
  const getScoreColor = (val: number) => {
    if (val >= 80) return '#10b981'; // Green (Low Risk)
    if (val >= 55) return '#f59e0b'; // Yellow (Medium Risk)
    if (val >= 35) return '#f97316'; // Orange (High Risk)
    return '#ef4444'; // Red (Critical Risk)
  };

  const downloadCSVTemplate = () => {
    const csvContent = "date,montant,type,categorie,description\n2026-06-01,1500000,credit,Ventes,Facture Client A\n2026-06-05,450000,debit,Loyer,Loyer mensuel local\n2026-06-10,950000,debit,Salaires,Paiement salaires Juin\n2026-06-15,1200000,credit,Prestations,Prestation conseil B";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modele_grand_livre.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFloatingChat = () => {
    // Les anciens états (chatOpen, chatMessages, etc.) sont gardés pour ne pas 
    // déclencher de TypeScript warnings, mais le rendu utilise le nouveau composant centralisé.
    return <CopilotWidget />;
  };

  // 0. PUBLIC LANDING PAGE (UNAUTHENTICATED) WITH HOME, LOGIN, REGISTER, & ADMIN_LOGIN SUBVIEWS
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0f19', color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
        
        {/* Landing Header */}
        <header className="glass-card responsive-header" style={{ margin: '24px 24px 0 24px', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
          <h1 
            onClick={() => setAuthSubView('home')} 
            style={{ fontSize: '18pt', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px', cursor: 'pointer' }}
          >
            PME<span style={{ color: 'var(--primary)' }}>Analytix</span>
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => { setLoginError(''); setAuthSubView('login'); }} 
              className="btn-primary" 
              style={{ width: 'auto', padding: '8px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
            >
              Connexion PME
            </button>
            <button 
              onClick={() => { setRegisterError(''); setRegisterSuccess(''); setAuthSubView('register'); }} 
              className="btn-primary" 
              style={{ width: 'auto', padding: '8px 16px' }}
            >
              Inscription PME
            </button>
          </div>
        </header>

        {/* 1. PUBLIC PRESENTATION / HOME SECTION */}
        {authSubView === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
            {/* Hero Section */}
            <section style={{ padding: '80px 24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px', padding: '6px 16px', fontSize: '9pt', fontWeight: 600, display: 'inline-block', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Shield size={14} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px' }} /> Conforme aux normes réglementaires BCEAO & CDP Sénégal
              </div>
              
              <h2 style={{ fontSize: '32pt', fontWeight: 800, lineHeight: 1.2, margin: 0, letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                Pilotez la trésorerie de votre entreprise en toute simplicité
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '11pt', marginTop: '20px', lineHeight: 1.6, maxWidth: '640px' }}>
                Anticipez facilement vos rentrées et sorties d'argent à venir, obtenez une note de confiance claire pour vos demandes de prêt, et éditez des documents officiels pour rassurer votre banquier.
              </p>

              <div style={{ display: 'flex', gap: '16px', marginTop: '36px' }}>
                <button onClick={() => setAuthSubView('register')} className="btn-primary" style={{ width: 'auto', padding: '12px 32px', fontSize: '10pt', fontWeight: 700 }}>
                  Créer un compte PME gratuit
                </button>
                <button onClick={() => setAuthSubView('login')} className="btn-primary" style={{ width: 'auto', padding: '12px 32px', fontSize: '10pt', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  Se connecter
                </button>
              </div>
            </section>

            {/* Institutional Partners Slide Section */}
            <section style={{ padding: '0 24px 60px 24px', maxWidth: '640px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
              <h3 style={{ fontSize: '9.5pt', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '2px', marginBottom: '24px' }}>
                Partenaires Institutionnels & Conformité
              </h3>
              
              <div 
                className="glass-card" 
                style={{ 
                  padding: '32px 24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  position: 'relative', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  minHeight: '180px',
                  borderRadius: '16px',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.2)'
                }}
              >
                {/* Left/Right Buttons */}
                <button 
                  onClick={() => setPartnerIdx(prev => (prev - 1 + 5) % 5)}
                  style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.2s', padding: 0 }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  &larr;
                </button>
                
                <button 
                  onClick={() => setPartnerIdx(prev => (prev + 1) % 5)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.2s', padding: 0 }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  &rarr;
                </button>

                {/* Partner Details */}
                {partnerIdx === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '80%', transition: 'all 0.3s ease' }}>
                    <span style={{ fontSize: '24pt', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-1px' }}>ADPME</span>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Accompagnement & Distribution</span>
                    <p style={{ fontSize: '9pt', color: 'var(--text-muted)', margin: '12px 0 0 0', lineHeight: 1.5 }}>
                      L'Agence de Développement et d'Encadrement des PME soutient notre déploiement pour structurer et conseiller les entreprises locales.
                    </p>
                  </div>
                )}

                {partnerIdx === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '80%', transition: 'all 0.3s ease' }}>
                    <span style={{ fontSize: '24pt', fontWeight: 800, color: '#10b981', letterSpacing: '-1px' }}>BNDE</span>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Partenaire Financier Cible</span>
                    <p style={{ fontSize: '9pt', color: 'var(--text-muted)', margin: '12px 0 0 0', lineHeight: 1.5 }}>
                      La Banque Nationale pour le Développement Économique cible nos analyses de solvabilité certifiées pour accélérer le traitement des prêts.
                    </p>
                  </div>
                )}

                {partnerIdx === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '80%', transition: 'all 0.3s ease' }}>
                    <span style={{ fontSize: '24pt', fontWeight: 800, color: '#a855f7', letterSpacing: '-1px' }}>BCEAO</span>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Régulation & Sécurité</span>
                    <p style={{ fontSize: '9pt', color: 'var(--text-muted)', margin: '12px 0 0 0', lineHeight: 1.5 }}>
                      Conforme aux dispositions strictes de la Banque Centrale de l'Afrique de l'Ouest pour la gestion et la sécurité des relevés.
                    </p>
                  </div>
                )}

                {partnerIdx === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '80%', transition: 'all 0.3s ease' }}>
                    <span style={{ fontSize: '24pt', fontWeight: 800, color: '#f59e0b', letterSpacing: '-1px' }}>APIX</span>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Registre des Entreprises</span>
                    <p style={{ fontSize: '9pt', color: 'var(--text-muted)', margin: '12px 0 0 0', lineHeight: 1.5 }}>
                      Accès intégré et automatisé pour l'identification officielle instantanée de la PME à partir de son numéro NINEA unique.
                    </p>
                  </div>
                )}

                {partnerIdx === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '80%', transition: 'all 0.3s ease' }}>
                    <span style={{ fontSize: '24pt', fontWeight: 800, color: '#ef4444', letterSpacing: '-1px' }}>DGI</span>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Fiscalité & TVA</span>
                    <p style={{ fontSize: '9pt', color: 'var(--text-muted)', margin: '12px 0 0 0', lineHeight: 1.5 }}>
                      Conformité comptable SYSCOHADA pour l'analyse des charges d'impôts et l'évaluation automatisée de la marge brute.
                    </p>
                  </div>
                )}
              </div>

              {/* Dots indicators */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                {[0, 1, 2, 3, 4].map(idx => (
                  <button 
                    key={idx}
                    onClick={() => setPartnerIdx(idx)}
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: partnerIdx === idx ? 'var(--primary)' : 'rgba(255,255,255,0.15)', 
                      border: 'none', 
                      padding: 0, 
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Platform Features Grid */}
            <section style={{ padding: '0 24px 80px 24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '32px', textAlign: 'center' }}>
                Ce que PME Analytix fait pour vous
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px', color: 'var(--primary)' }}>
                    <TrendingUp size={32} />
                  </div>
                  <h4 style={{ fontSize: '11pt', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', color: '#f8fafc' }}>Prévision de Trésorerie</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Visualisez l'état futur de votre compte en banque sur les prochains mois pour anticiper et éviter les imprévus.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px', color: '#10b981' }}>
                    <Shield size={32} />
                  </div>
                  <h4 style={{ fontSize: '11pt', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', color: '#f8fafc' }}>Note de Solidité Financière</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Calculez une note claire évaluant la santé financière de votre entreprise pour rassurer vos partenaires commerciaux et financiers.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px', color: '#a855f7' }}>
                    <FileText size={32} />
                  </div>
                  <h4 style={{ fontSize: '11pt', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', color: '#f8fafc' }}>Dossiers de Crédit Prêts</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Téléchargez en un clic des rapports de solvabilité officiels au format PDF, certifiés et conformes aux exigences des banques.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px', color: '#f59e0b' }}>
                    <Calendar size={32} />
                  </div>
                  <h4 style={{ fontSize: '11pt', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', color: '#f8fafc' }}>Accompagnement & Financements</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Prenez rendez-vous directement avec des conseillers ADPME et des banques partenaires pour accélérer vos demandes de prêt.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 2. PME CLIENT LOGIN FORM */}
        {authSubView === 'login' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 24px' }}>
            <Card 
              title="Connexion Espace PME" 
              subtitle="Saisissez vos identifiants pour accéder à vos analyses de trésorerie." 
              style={{ width: '100%', maxWidth: '400px', padding: '40px 32px' }} 
              hoverable={false}
            >
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: '16px' }}>
                <Input 
                  type="email" 
                  label="Adresse Email"
                  placeholder="contact@entreprise.sn"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  leftIcon={<Mail size={16} />}
                />

                <Input 
                  type="password" 
                  label="Mot de passe"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  leftIcon={<Lock size={16} />}
                />

                {loginError && (
                  <div style={{ padding: '12px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#f87171', borderRadius: '8px', fontSize: '9pt', textAlign: 'center' }}>
                    {loginError}
                  </div>
                )}

                <Button type="submit" style={{ marginTop: '8px' }}>Se connecter</Button>
                
                <button type="button" onClick={() => setAuthSubView('register')} style={{ display: 'block', margin: '8px auto 0 auto', background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '9pt' }}>
                  Créer un compte PME
                </button>
                <button type="button" onClick={() => setAuthSubView('home')} style={{ display: 'block', margin: '4px auto 0 auto', background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '9pt' }}>
                  ← Retour
                </button>
              </form>
            </Card>
          </div>
        )}

        {/* 3. PME CLIENT SELF-REGISTRATION FORM */}
        {authSubView === 'register' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 24px' }}>
            <Card
              title="S'enregistrer sur PME Analytix"
              subtitle="Inscrivez votre PME et initiez votre schéma de données sécurisé."
              style={{ width: '100%', maxWidth: '440px', textAlign: 'left' }}
              hoverable={false}
            >
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Input
                  label="Nom de l'Entreprise"
                  placeholder="Dakar Tech"
                  value={nomPme}
                  onChange={e => setNomPme(e.target.value)}
                  required
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '8pt', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Secteur</label>
                    <select value={secteur} onChange={e => setSecteur(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#f8fafc', outline: 'none', height: '42px', fontSize: '9.5pt' }}>
                      <option value="Technologie">Technologie</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Industrie">Industrie</option>
                    </select>
                  </div>
                  <Input
                    label="SIREN / Identifiant"
                    placeholder="SN-DKR-2026"
                    value={siren}
                    onChange={e => setSiren(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Adresse Email"
                  type="email"
                  placeholder="contact@entreprise.sn"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                <Input
                  label="Mot de passe"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />

                {registerError && (
                  <div style={{ padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#f87171', borderRadius: '8px', fontSize: '8.5pt', textAlign: 'center' }}>
                    {registerError}
                  </div>
                )}

                {registerSuccess && (
                  <div style={{ padding: '10px', background: 'var(--success-glow)', border: '1px solid #10b981', color: '#10b981', borderRadius: '8px', fontSize: '8.5pt', textAlign: 'center' }}>
                    {registerSuccess}
                  </div>
                )}

                <Button type="submit" variant="primary" style={{ marginTop: '10px', width: '100%' }}>
                  Créer le compte PME
                </Button>
                
                <button type="button" onClick={() => { setRegisterError(''); setRegisterSuccess(''); setAuthSubView('login'); }} style={{ display: 'block', margin: '12px auto 0 auto', background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '9pt' }}>
                  Déjà un compte ? Se connecter
                </button>
                <button type="button" onClick={() => { setRegisterError(''); setRegisterSuccess(''); setAuthSubView('home'); }} style={{ display: 'block', margin: '8px auto 0 auto', background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '9pt' }}>
                  ← Retour
                </button>
              </form>
            </Card>
          </div>
        )}

        {/* 4. ADMIN/OPERATOR LOGIN FORM */}
        {authSubView === 'admin_login' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 24px' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '40px 32px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 700, margin: '0 0 8px 0', color: '#f59e0b', textAlign: 'left' }}>Accès Opérateur / Admin</h3>
              <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'left' }}>Espace réservé aux analystes de la plateforme et superviseurs de l'ADPME.</p>
              
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '8.5pt', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>Email Opérateur</label>
                  <input 
                    type="email" 
                    placeholder="admin@pme.sn"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '8.5pt', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>Mot de passe</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {loginError && (
                  <div style={{ padding: '12px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#f87171', borderRadius: '8px', fontSize: '9pt', marginBottom: '16px', textAlign: 'center' }}>
                    {loginError}
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: '1px solid #d97706' }}>
                  Connexion Admin
                </button>
                <button type="button" onClick={() => setAuthSubView('home')} style={{ display: 'block', margin: '16px auto 0 auto', background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '9pt' }}>
                  ← Retour à l'accueil
                </button>
              </form>
            </div>
          </div>
        )}
        <Footer onOperatorClick={() => { setLoginError(''); setAuthSubView('admin_login'); }} />
      </div>
    );
  }

  // 1.8. RENDER OPERATOR WORKSPACE (PME LIST) IF OPERATOR AND NO PME SELECTED
  const userRole = api.getUserRole();
  if (userRole === 'operateur' && selectedPmeId === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0f19', color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
        
        {/* Header */}
        <header className="glass-card responsive-header" style={{ margin: '24px 24px 0 24px', padding: '16px 24px', borderRadius: '16px' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              PME<span style={{ color: 'var(--primary)' }}>Analytix</span>
            </h1>
            <span style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Console d'Administration Globale (Opérateur Platform)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '9pt', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
              {api.getUserEmail()}
            </span>
            <button onClick={handleLogout} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Global KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', padding: '24px 24px 0 24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <div className="glass-card" style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>PMEs Enregistrées</span>
            <h2 style={{ fontSize: '24pt', fontWeight: 750, margin: '8px 0 0 0', color: 'var(--primary)' }}>{pmeList.length}</h2>
          </div>
          <div className="glass-card" style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Plans Actifs (Pilote / Croissance)</span>
            <h2 style={{ fontSize: '24pt', fontWeight: 750, margin: '8px 0 0 0', color: '#10b981' }}>
              {pmeList.filter(p => p.plan === 'pilote' || p.plan === 'croissance').length}
            </h2>
          </div>
          <div className="glass-card" style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Taux de Conversion Premium</span>
            <h2 style={{ fontSize: '24pt', fontWeight: 750, margin: '8px 0 0 0', color: '#a855f7' }}>
              {pmeList.length > 0 ? ((pmeList.filter(p => p.plan === 'pilote' || p.plan === 'croissance').length / pmeList.length) * 100).toFixed(0) : 0}%
            </h2>
          </div>
        </div>

        {/* PME List Table */}
        <div className="glass-card" style={{ margin: '24px auto', padding: '24px', flexGrow: 1, maxWidth: '1200px', width: 'calc(100% - 48px)', textAlign: 'left' }}>
          <h3 style={{ fontSize: '12pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '20px' }}>
            Portefeuille des PMEs Enregistrées
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>ID</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Nom PME</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Secteur</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>SIREN</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Forfait</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Date d'adhésion</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pmeList.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>#{p.id}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.nom}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{p.secteur}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{p.siren}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontSize: '8pt', 
                        fontWeight: 600,
                        background: p.plan === 'starter' ? 'rgba(255,255,255,0.05)' : p.plan === 'pilote' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                        color: p.plan === 'starter' ? 'var(--text-secondary)' : p.plan === 'pilote' ? 'var(--primary)' : '#c084fc',
                        border: '1px solid',
                        borderColor: p.plan === 'starter' ? 'var(--card-border)' : p.plan === 'pilote' ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)'
                      }}>
                        {p.plan.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{p.created_at}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => {
                          setSelectedPmeId(p.id);
                          setSelectedPmeName(p.nom);
                        }} 
                        className="btn-primary" 
                        style={{ width: 'auto', padding: '6px 14px', fontSize: '8.5pt' }}
                      >
                        Visualiser le Dashboard
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 1.5. RENDER PRICING PAGE IF SHOWN AFTER CSV UPLOAD OR MANUALLY SELECTED
  if (viewMode === 'pricing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0f19', color: '#f8fafc', padding: '40px 20px', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Welcome / Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '600px' }}>
          <h1 style={{ fontSize: '28pt', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '-1.5px' }}>
            PME<span style={{ color: 'var(--primary)' }}>Analytix</span>
          </h1>
          <h2 style={{ fontSize: '18pt', fontWeight: 700, marginTop: '16px', color: '#f8fafc' }}>
            Choisissez votre forfait de pilotage
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '10pt', marginTop: '12px', lineHeight: 1.6 }}>
            Activez la puissance de l'analyse financière et de l'intelligence artificielle pour votre PME.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%', maxWidth: '960px', marginBottom: '40px' }}>
          
          {/* Starter (Gratuit) */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', border: currentPlan === 'starter' ? '2px solid var(--primary)' : '1px solid var(--card-border)', position: 'relative' }}>
            {currentPlan === 'starter' && (
              <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '2px 8px', fontSize: '7.5pt', fontWeight: 600 }}>Plan Actif</span>
            )}
            <h3 style={{ fontSize: '14pt', margin: 0, color: 'var(--text-primary)', textAlign: 'left' }}>Starter</h3>
            <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', display: 'block', textAlign: 'left' }}>Pour débuter</span>
            <div style={{ margin: '24px 0', fontSize: '24pt', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'left' }}>
              0 FCFA <span style={{ fontSize: '10pt', fontWeight: 400, color: 'var(--text-secondary)' }}>/ à vie</span>
            </div>
            
            <ul style={{ paddingLeft: '16px', margin: '0 0 32px 0', fontSize: '9pt', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <li>Historique financier limité (3 mois)</li>
              <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Pas de prévisions de trésorerie (Prophet)</li>
              <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Pas d'analyse de score de crédit (XGBoost)</li>
              <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Pas de rapports certifiés SYSCOHADA</li>
            </ul>

            <button 
              onClick={() => {
                setViewMode('dashboard');
              }}
              className="btn-primary" 
              style={{ marginTop: 'auto', background: currentPlan === 'starter' ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.1)', color: currentPlan === 'starter' ? 'var(--text-secondary)' : '#f87171', border: currentPlan === 'starter' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              Continuer avec le Plan Gratuit
            </button>
          </div>

          {/* Pilote */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', border: currentPlan === 'pilote' ? '2px solid var(--primary)' : '1px solid var(--card-border)', position: 'relative' }}>
            {currentPlan === 'pilote' && (
              <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--success-glow)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '2px 8px', fontSize: '7.5pt', fontWeight: 600 }}>Plan Actif</span>
            )}
            <h3 style={{ fontSize: '14pt', margin: 0, color: 'var(--text-primary)', textAlign: 'left' }}>Pilote</h3>
            <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', display: 'block', textAlign: 'left' }}>Pour piloter</span>
            <div style={{ margin: '24px 0', fontSize: '24pt', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'left' }}>
              15 000 FCFA <span style={{ fontSize: '10pt', fontWeight: 400, color: 'var(--text-secondary)' }}>/ mois</span>
            </div>
            
            <ul style={{ paddingLeft: '16px', margin: '0 0 32px 0', fontSize: '9pt', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <li>Historique financier étendu (24 mois)</li>
              <li>Prévisions de trésorerie complètes (IA Prophet)</li>
              <li>Analyse de score de crédit (IA XGBoost)</li>
              <li>Rapports certifiés disponibles (25 000 F / unité)</li>
            </ul>

            <button 
              onClick={() => {
                if (currentPlan === 'pilote') {
                  setViewMode('dashboard');
                } else {
                  handleChangePlan('pilote');
                }
              }}
              className="btn-primary" 
              style={{ marginTop: 'auto' }}
            >
              {currentPlan === 'pilote' ? 'Accéder au Tableau de Bord' : 'Payer en ligne (Visa, Wave)'}
            </button>
          </div>

          {/* Croissance */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', border: currentPlan === 'croissance' ? '2px solid var(--primary)' : '1px solid rgba(168,85,247,0.3)', position: 'relative', boxShadow: '0 10px 30px rgba(168,85,247,0.1)' }}>
            <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: 'white', borderRadius: '12px', padding: '4px 12px', fontSize: '8pt', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Recommandé</span>
            {currentPlan === 'croissance' && (
              <span style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--success-glow)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '2px 8px', fontSize: '7.5pt', fontWeight: 600 }}>Plan Actif</span>
            )}
            <h3 style={{ fontSize: '14pt', margin: 0, color: 'var(--text-primary)', marginTop: '6px', textAlign: 'left' }}>Croissance</h3>
            <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', display: 'block', textAlign: 'left' }}>Illimité & Prioritaire</span>
            <div style={{ margin: '24px 0', fontSize: '24pt', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'left' }}>
              45 000 FCFA <span style={{ fontSize: '10pt', fontWeight: 400, color: 'var(--text-secondary)' }}>/ mois</span>
            </div>
            
            <ul style={{ paddingLeft: '16px', margin: '0 0 32px 0', fontSize: '9pt', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <li><strong>Historique de données illimité</strong></li>
              <li>Prévisions de trésorerie complètes (IA Prophet)</li>
              <li>Analyse de score de crédit (IA XGBoost)</li>
              <li><strong>5 rapports certifiés inclus / mois</strong> (offerts)</li>
            </ul>

            <button 
              onClick={() => {
                if (currentPlan === 'croissance') {
                  setViewMode('dashboard');
                } else {
                  handleChangePlan('croissance');
                }
              }}
              className="btn-primary" 
              style={{ marginTop: 'auto', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' }}
            >
              {currentPlan === 'croissance' ? 'Accéder au Tableau de Bord' : 'Payer en ligne (Visa, Wave)'}
            </button>
          </div>

        </div>

        <button 
          onClick={() => setViewMode('dashboard')} 
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '9.5pt' }}
        >
          Aller directement au Tableau de Bord (avec le plan actuel : {currentPlan.toUpperCase()})
        </button>
        <Footer />
      </div>
    );
  }

  // 2. PREPARE THE INTERACTIVE SVG PLOT COORDINATES FOR PROPHET
  let svgPathPoints = '';
  let svgAreaPoints95 = '';
  let svgAreaPoints80 = '';
  let gridLinesX: { x: number; label: string }[] = [];
  let gridLinesY: { y: number; val: string }[] = [];
  
  const width = 800;
  const height = 300;
  const paddingLeft = 70;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  let getX = (_index: number) => 0;
  let getY = (_val: number) => 0;

  if (forecast && forecast.length > 0) {
    const uppers = forecast.map(f => f.upper_95);
    const lowers = forecast.map(f => f.lower_95);
    
    let minVal = Math.min(...lowers, currentBalance);
    let maxVal = Math.max(...uppers, currentBalance);
    const padding = (maxVal - minVal) * 0.05;
    minVal = minVal - padding;
    maxVal = maxVal + padding;
    if (minVal === maxVal) {
      minVal -= 1000;
      maxVal += 1000;
    }
    const valRange = maxVal - minVal;
    
    getX = (index: number) => {
      return paddingLeft + (index / (forecast.length - 1)) * (width - paddingLeft - paddingRight);
    };

    getY = (val: number) => {
      return height - paddingBottom - ((val - minVal) / valRange) * (height - paddingTop - paddingBottom);
    };

    // Build the prediction path
    svgPathPoints = forecast.map((f, i) => `${getX(i)},${getY(f.value)}`).join(' L ');
    if (svgPathPoints) svgPathPoints = 'M ' + svgPathPoints;

    // Build the closed area polygon for the confidence intervals (upper curve then backwards lower curve)
    const upperPoints95 = forecast.map((f, i) => `${getX(i)},${getY(f.upper_95)}`).join(' L ');
    const lowerPoints95 = forecast.map((_, i) => `${getX(forecast.length - 1 - i)},${getY(forecast[forecast.length - 1 - i].lower_95)}`).join(' L ');
    svgAreaPoints95 = `M ${upperPoints95} L ${lowerPoints95} Z`;

    const upperPoints80 = forecast.map((f, i) => `${getX(i)},${getY(f.upper_80 || f.upper_95)}`).join(' L ');
    const lowerPoints80 = forecast.map((_, i) => `${getX(forecast.length - 1 - i)},${getY(forecast[forecast.length - 1 - i].lower_80 || forecast[forecast.length - 1 - i].lower_95)}`).join(' L ');
    svgAreaPoints80 = `M ${upperPoints80} L ${lowerPoints80} Z`;

    // Horizontal gridlines (Values in Million FCFA)
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = minVal + (i / steps) * valRange;
      const y = getY(val);
      gridLinesY.push({ y, val: (val / 1000000).toFixed(1) + 'M' });
    }

    // Vertical gridlines (Dates)
    const dateSteps = 5;
    for (let i = 0; i < dateSteps; i++) {
      const idx = Math.floor((i / (dateSteps - 1)) * (forecast.length - 1));
      const f = forecast[idx];
      if (f) {
        gridLinesX.push({ x: getX(idx), label: f.date.split('-').slice(1).reverse().join('/') });
      }
    }
  }

  // 2.5. RENDER GUIDED ONBOARDING WIZARD IF NEW PME (NO TRANSACTIONS) AND NOT SKIPPED/COMPLETED
  const isOperator = api.getUserRole() === 'operateur';
  if (!isOperator && viewMode === 'onboarding') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0f19', color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
        
        {/* Header */}
        <header className="glass-card responsive-header" style={{ margin: '24px 24px 0 24px', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              PME<span style={{ color: 'var(--primary)' }}>Analytix</span>
            </h1>
            <span style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Guide d'Onboarding & Configuration Initiale
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setViewMode('dashboard')} 
              className="btn-primary" 
              style={{ width: 'auto', padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}
            >
              Passer l'Onboarding
            </button>
            <button 
              onClick={handleLogout} 
              className="btn-primary" 
              style={{ width: 'auto', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Main Content: Guide Card */}
        <div style={{ display: 'flex', flexGrow: 1, padding: '24px', boxSizing: 'border-box', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
          
          {/* Guide Card */}
          <div className="glass-card" style={{ maxWidth: '800px', width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', textAlign: 'left', overflowY: 'auto', maxHeight: '100%' }}>
            <h2 style={{ fontSize: '16pt', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Démarrez sereinement en 3 étapes simples
            </h2>
            <p style={{ fontSize: '9.5pt', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              PME Analytix vous aide à comprendre la santé financière de votre entreprise et à faciliter vos demandes de crédit bancaire.
            </p>

            {/* Sector Selection (Step 0) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <h4 id="sector-label" style={{ fontSize: '10.5pt', fontWeight: 700, margin: 0, color: '#f8fafc' }}>Quel est votre secteur d'activité ?</h4>
              <div role="radiogroup" aria-labelledby="sector-label" style={{ display: 'flex', gap: '12px' }}>
                {['commerce', 'btp', 'tech'].map(sec => (
                  <Button
                    key={sec}
                    role="radio"
                    aria-checked={onboardingSector === sec}
                    variant={onboardingSector === sec ? 'primary' : 'outline'}
                    onClick={() => setOnboardingSector(sec)}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                  >
                    {sec === 'commerce' ? 'Commerce / Boutique' : sec === 'btp' ? 'BTP / Logistique' : 'Tech / Services'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Steps Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <h4 style={{ fontSize: '10.5pt', fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>Choisissez votre forfait</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Sélectionnez le plan d'abonnement qui correspond le mieux aux besoins de votre entreprise pour activer votre espace.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <h4 style={{ fontSize: '10.5pt', fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>
                    {onboardingSector === 'commerce' ? "Connectez Wave / Orange Money" : 
                     onboardingSector === 'btp' ? "Importez vos factures (Créances)" : 
                     "Importez votre fichier financier"}
                  </h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {onboardingSector === 'commerce' ? 
                     "Une fois sur le tableau de bord, rendez-vous dans les paramètres pour synchroniser vos paiements mobile money (Lecture seule)." : 
                     onboardingSector === 'btp' ? 
                     "Chargez vos factures pour que l'IA prédise vos rentrées d'argent et vous aide à relancer les retards de paiement." :
                     "Une fois sur votre tableau de bord, chargez votre fichier d'activité (Excel ou CSV) pour démarrer."}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <h4 style={{ fontSize: '10.5pt', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>Analysez et partagez</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Consultez vos prévisions de trésorerie, votre note de confiance, et téléchargez vos rapports PDF certifiés pour les banques.
                  </p>
                </div>
              </div>
            </div>

            {/* Commencer CTA Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <Button 
                onClick={() => setViewMode('pricing')} 
                variant="primary" 
                size="lg"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', width: '100%', justifyContent: 'center' }}
              >
                Accéder à mon Tableau de Bord
              </Button>
            </div>

            {/* Ce que PME Analytix apporte à votre entreprise */}
            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0, borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                Ce que PME Analytix apporte à votre entreprise
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Benefit 1 */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '9.5pt', fontWeight: 700, color: '#f8fafc' }}>Suivi Simple de l'Activité</span>
                  </div>
                  <p style={{ fontSize: '8pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Visualisez vos revenus, vos dépenses, et vos bénéfices sur un graphique clair et intuitif, sans calculs compliqués.
                  </p>
                </div>

                {/* Benefit 2 */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Shield size={16} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '9.5pt', fontWeight: 700, color: '#f8fafc' }}>Prévision de votre Trésorerie</span>
                  </div>
                  <p style={{ fontSize: '8pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Anticipez les mois à venir pour savoir si vous disposez d'assez d'argent pour payer vos factures et investir.
                  </p>
                </div>

                {/* Benefit 3 */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FileText size={16} style={{ color: '#a855f7' }} />
                    <span style={{ fontSize: '9.5pt', fontWeight: 700, color: '#f8fafc' }}>Obtention Facile de Crédits</span>
                  </div>
                  <p style={{ fontSize: '8pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Obtenez une note de confiance claire et générez des rapports officiels pour rassurer les banques et décrocher des prêts.
                  </p>
                </div>

                {/* Benefit 4 */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Lock size={16} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '9.5pt', fontWeight: 700, color: '#f8fafc' }}>Sécurité et Confidentialité</span>
                  </div>
                  <p style={{ fontSize: '8pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Vos données financières sont chiffrées et isolées. Personne d'autre que vous ne peut y avoir accès.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
        <Footer />
        {renderFloatingChat()}
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Backdrop Overlay */}
      <div 
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'open' : ''}`} 
        onClick={() => setMobileSidebarOpen(false)}
      ></div>
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside id="mobile-sidebar-nav" className={`glass-card sidebar-aside ${mobileSidebarOpen ? 'open' : ''}`}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              PME<span style={{ color: 'var(--primary)' }}>Analytix</span>
            </h1>
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className="mobile-menu-toggle"
              style={{ padding: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
          <span style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', textTransform: 'capitalize' }}>
            {selectedPmeName ? `${selectedPmeName} (Audit)` : "Mon Espace PME"}
          </span>
        </div>

        {/* NAV ITEMS */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          <button 
            onClick={() => { setActiveSection('dashboard'); setMobileSidebarOpen(false); }} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeSection === 'dashboard' ? 'var(--primary-glow)' : 'none', border: 'none', color: activeSection === 'dashboard' ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '9.5pt', width: '100%' }}
          >
            <Activity size={18} /> Tableau de bord
          </button>
          <button 
            onClick={() => { setActiveSection('transactions'); setMobileSidebarOpen(false); }} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeSection === 'transactions' ? 'var(--primary-glow)' : 'none', border: 'none', color: activeSection === 'transactions' ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '9.5pt', width: '100%' }}
          >
            <TrendingUp size={18} /> Transactions & Import
          </button>
          <button 
            onClick={() => { setActiveSection('reports'); setMobileSidebarOpen(false); }} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeSection === 'reports' ? 'var(--primary-glow)' : 'none', border: 'none', color: activeSection === 'reports' ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '9.5pt', width: '100%' }}
          >
            <FileText size={18} /> Rapports Certifiés
          </button>
          <button 
            onClick={() => { setActiveSection('rendezvous'); setMobileSidebarOpen(false); }} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeSection === 'rendezvous' ? 'var(--primary-glow)' : 'none', border: 'none', color: activeSection === 'rendezvous' ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '9.5pt', width: '100%' }}
          >
            <Calendar size={18} /> Rendez-vous & Conseil
          </button>
          <button 
            onClick={() => { setActiveSection('simulator'); setMobileSidebarOpen(false); }} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeSection === 'simulator' ? 'var(--primary-glow)' : 'none', border: 'none', color: activeSection === 'simulator' ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '9.5pt', width: '100%' }}
          >
            <Sliders size={18} /> Simulateur de Croissance
          </button>
          <button 
            onClick={() => { setActiveSection('billing'); setMobileSidebarOpen(false); }} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeSection === 'billing' ? 'var(--primary-glow)' : 'none', border: 'none', color: activeSection === 'billing' ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '9.5pt', width: '100%' }}
          >
            <Shield size={18} /> Forfait & Abonnement
          </button>
        </nav>

        {/* LOGOUT & CONSOLE */}
        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedPmeId && (
            <button 
              onClick={() => { setSelectedPmeId(null); loadDashboardData(); setMobileSidebarOpen(false); }} 
              className="btn-primary" 
              style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '8.5pt', padding: '8px 12px', width: '100%' }}
            >
              ← Console Opérateur
            </button>
          )}
          <button 
            onClick={handleLogout} 
            className="btn-primary" 
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '8.5pt', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', maxHeight: '100vh' }}>
        
        {/* TOP HEADER */}
        <header style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setMobileSidebarOpen(true)} 
              className="mobile-menu-toggle"
              aria-label="Ouvrir le menu de navigation"
              aria-expanded={mobileSidebarOpen}
              aria-controls="mobile-sidebar-nav"
              style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Menu size={16} />
            </button>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '16pt', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                {activeSection === 'dashboard' && "Tableau de Bord Financier"}
                {activeSection === 'transactions' && "Grand Livre & Importation CSV"}
                {activeSection === 'reports' && "Rapports Comptables Certifiés"}
                {activeSection === 'rendezvous' && "Prendre Rendez-vous & Conseils"}
                 {activeSection === 'billing' && "Plan de Facturation"}
                {activeSection === 'eda' && "Analyse Exploratoire des Données (EDA)"}
                {activeSection === 'simulator' && "Simulateur de Croissance Stratégique IA"}
              </h2>
              <span style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                Utilisateur connecté : {api.getUserEmail()} | Plan actuel : <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{currentPlan}</strong>
              </span>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div style={{ padding: '12px 24px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#f87171', borderRadius: '10px', fontSize: '9.5pt', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* SECTION 1: DASHBOARD OVERVIEW */}
        {activeSection === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* WELCOME / GET STARTED BANNER */}
            {loadingTransactions ? (
              <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Skeleton width="60%" height="28px" />
                <Skeleton width="100%" height="16px" />
                <Skeleton width="80%" height="16px" />
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <Skeleton width="150px" height="36px" />
                  <Skeleton width="150px" height="36px" />
                </div>
              </div>
            ) : transactions.length === 0 && (
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--primary-glow)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <TrendingUp size={20} />
                    </div>
                    <span>Bienvenue sur votre Tableau de Bord PME Analytix !</span>
                  </div>
                }
                subtitle="Votre espace de travail est maintenant configuré. Pour débloquer la note de solidité financière et les courbes prévisionnelles, vous devez importer votre premier relevé financier."
                style={{ padding: '24px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', textAlign: 'left' }}
                hoverable={false}
              >
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                  <Button 
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveSection('transactions')} 
                    leftIcon={<UploadCloud size={14} />}
                  >
                    Importer mon document (CSV / Excel)
                  </Button>
                  <Button 
                    variant="secondary"
                    size="sm"
                    leftIcon={<FileText size={14} />}
                    onClick={async () => {
                      try {
                        const demoData = [
                          { date: '2026-05-01', montant: 2500000, type: 'credit', categorie: 'Ventes Produits' },
                          { date: '2026-05-05', montant: 800000, type: 'debit', categorie: 'Loyer Bureau' },
                          { date: '2026-05-10', montant: 1200000, type: 'credit', categorie: 'Prestations de Service' },
                          { date: '2026-05-12', montant: 150000, type: 'debit', categorie: 'Fournitures bureau' },
                          { date: '2026-05-15', montant: 950000, type: 'debit', categorie: 'Salaires' },
                          { date: '2026-05-18', montant: 3000000, type: 'credit', categorie: 'Contrat ADPME' },
                          { date: '2026-05-20', montant: 450000, type: 'debit', categorie: 'Frais Internet & Tech' },
                          { date: '2026-05-25', montant: 600000, type: 'debit', categorie: 'Taxes & Impôts' },
                          { date: '2026-06-01', montant: 2700000, type: 'credit', categorie: 'Ventes Produits' },
                          { date: '2026-06-05', montant: 800000, type: 'debit', categorie: 'Loyer Bureau' },
                          { date: '2026-06-08', montant: 1500000, type: 'credit', categorie: 'Prestations de Service' },
                          { date: '2026-06-15', montant: 950000, type: 'debit', categorie: 'Salaires' },
                          { date: '2026-06-20', montant: 2200000, type: 'credit', categorie: 'Ventes Produits' },
                          { date: '2026-06-22', montant: 120000, type: 'debit', categorie: 'Marketing Digital' },
                          { date: '2026-06-25', montant: 500000, type: 'debit', categorie: 'Taxes & Impôts' }
                        ];
                        setTransactions(demoData as any);
                        showToast("Données de démonstration chargées temporairement. Vous pouvez explorer les graphiques et fonctionnalités !", "success");
                      } catch (err) {
                        showToast("Erreur lors du chargement des données.", "error");
                      }
                    }} 
                  >
                    Utiliser des données de démonstration
                  </Button>
                </div>
              </Card>
            )}

            {/* INTELLIGENT ALERTS WIDGET */}
            {alerts && alerts.filter(a => a.statut === 'active').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '10pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} style={{ color: '#ef4444' }} /> Alertes Financières Intelligentes ({alerts.filter(a => a.statut === 'active').length}) {loadingAlerts && <span style={{ fontSize: '8pt', color: 'var(--text-muted)', textTransform: 'none', marginLeft: '6px' }}>(Mise à jour...)</span>}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {alerts.filter(a => a.statut === 'active').map((alert) => {
                    let borderCol = 'rgba(239, 68, 68, 0.2)'; // Default red
                    let bgCol = 'rgba(239, 68, 68, 0.02)';
                    let iconColor = '#ef4444';
                    
                    if (alert.type === 'marge_basse' || alert.type === 'stock_critique') {
                      borderCol = 'rgba(245, 158, 11, 0.2)'; // Amber
                      bgCol = 'rgba(245, 158, 11, 0.02)';
                      iconColor = '#f59e0b';
                    } else if (alert.type === 'retard_paiement') {
                      borderCol = 'rgba(59, 130, 246, 0.2)'; // Blue
                      bgCol = 'rgba(59, 130, 246, 0.02)';
                      iconColor = '#3b82f6';
                    }

                    return (
                      <div key={alert.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', border: `1px solid ${borderCol}`, background: bgCol, gap: '12px', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {alert.type === 'tresorerie_critique' && <AlertTriangle size={18} />}
                            {alert.type === 'retard_paiement' && <Calendar size={18} />}
                            {alert.type === 'marge_basse' && <BarChart3 size={18} />}
                            {alert.type === 'score_baisse' && <Shield size={18} />}
                            {alert.type === 'stock_critique' && <Package size={18} />}
                            {alert.type === 'anomalie_depense' && <AlertTriangle size={18} />}
                          </div>
                          <div style={{ flexGrow: 1 }}>
                            <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', textTransform: 'capitalize' }}>
                              {alert.type.replace('_', ' ')}
                            </span>
                            <p style={{ fontSize: '8.5pt', color: '#f1f5f9', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                              {alert.description}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '8pt', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          {alert.montant_jeu && (
                            <span>
                              <DollarSign size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px', marginTop: '-2px' }} />
                              Montant : <strong>{Math.round(parseFloat(alert.montant_jeu)).toLocaleString('fr-FR')} FCFA</strong>
                            </span>
                          )}
                          {alert.date_critique && (
                            <span>
                              <Calendar size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px', marginTop: '-2px' }} />
                              Date limite : <strong>{new Date(alert.date_critique).toLocaleDateString('fr-FR')}</strong>
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {alert.lien_direct && (
                            <button 
                              onClick={() => setActiveSection(alert.lien_direct as any)}
                              className="btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '8pt', fontWeight: 600, width: 'auto', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ArrowUpRight size={12} />
                              {alert.action_recommandee || "Agir immédiatement"}
                            </button>
                          )}
                          <button 
                            onClick={() => handleResolveAlert(alert.id, 'resolue')}
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '8pt', fontWeight: 600, width: 'auto', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CheckCircle size={12} />
                            Archiver
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* KPI ROW */}
            <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
              {/* Solde Card */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Trésorerie Actuelle</span>
                  <h2 style={{ fontSize: '20pt', fontWeight: 700, margin: '8px 0 0 0', color: 'var(--primary)' }}>
                    {loadingTransactions ? <Skeleton variant="text" width="140px" height="32px" /> : (
                      <>{computedTreasuryBalance.toLocaleString('fr-FR')} <span style={{ fontSize: '12pt', fontWeight: 500 }}>FCFA</span></>
                    )}
                  </h2>
                  <span style={{ fontSize: '8pt', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Dernière transaction : {transactions && transactions.length > 0 ? new Date(Math.max(...transactions.map((t: any) => new Date(t.date).getTime()))).toLocaleDateString('fr-FR') : 'N/A'}</span>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'var(--primary-glow)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <TrendingUp size={24} style={{ margin: 'auto' }} />
                </div>
              </div>

              {/* Cash Runway Card */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: cashRunway?.isCritical ? '1px solid rgba(239, 68, 68, 0.4)' : undefined }}>
                <div>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Cash Runway (Survie)</span>
                  <h2 style={{ fontSize: '20pt', fontWeight: 700, margin: '8px 0 0 0', color: cashRunway?.isCritical ? '#ef4444' : '#10b981' }}>
                    {loadingScore ? <Skeleton variant="text" width="80px" height="32px" /> : (
                      <>{cashRunway ? cashRunway.months : 'N/A'} <span style={{ fontSize: '12pt', fontWeight: 500 }}>Mois</span></>
                    )}
                  </h2>
                  <span style={{ fontSize: '8pt', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Dépenses : ~{cashRunway ? cashRunway.burnRate.toLocaleString('fr-FR') : '0'} FCFA/mois
                  </span>
                </div>
                <div style={{ width: '48px', height: '48px', background: cashRunway?.isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cashRunway?.isCritical ? '#ef4444' : '#10b981' }}>
                  <Calendar size={24} style={{ margin: 'auto' }} />
                </div>
              </div>

              {/* Liquidite Card */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Indice de Liquidité (SYSCOHADA)</span>
                  <h2 style={{ fontSize: '20pt', fontWeight: 700, margin: '8px 0 0 0', color: '#10b981' }}>
                    {loadingScore ? <Skeleton variant="text" width="60px" height="32px" /> : (score?.features?.liquidity_ratio !== undefined ? score.features.liquidity_ratio.toFixed(2) : 'N/A')}
                  </h2>
                  <span style={{ fontSize: '8pt', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Cible recommandée : &gt; 1.0</span>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <Activity size={24} style={{ margin: 'auto' }} />
                </div>
              </div>

              {/* Risque Card */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Profil de Risque (XGBoost)</span>
                  <h2 style={{ fontSize: '20pt', fontWeight: 700, margin: '8px 0 0 0', color: score?.score ? getScoreColor(score.score) : 'var(--primary)' }}>
                    {loadingScore ? <Skeleton variant="text" width="100px" height="32px" /> : (score?.risk_segment || 'N/A')}
                  </h2>
                  <span style={{ fontSize: '8pt', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Score prédictif : {score?.score || 'N/A'}/100</span>
                </div>
                <div style={{ width: '48px', height: '48px', background: score?.score ? `${getScoreColor(score.score)}1A` : 'var(--primary-glow)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: score?.score ? getScoreColor(score.score) : 'var(--primary)' }}>
                  <Shield size={24} style={{ margin: 'auto' }} />
                </div>
              </div>
            </div>

            {/* SECOND FINANCIAL KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', textAlign: 'left', marginTop: '24px' }}>
              
              {/* CA Card with N-1 Comparaison */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Chiffre d'Affaires</span>
                  <div style={{ padding: '6px', background: 'var(--primary-glow)', borderRadius: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={16} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>
                    <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Annuel (N) :</span>
                    <div style={{ fontSize: '14pt', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {loadingScore || edaDashboardLoading ? <Skeleton variant="text" width="100px" height="24px" /> : (
                        <>{Math.round(biMetrics.caAnnuel).toLocaleString('fr-FR')} FCFA</>
                      )}
                      <span style={{ fontSize: '8.5pt', color: biMetrics.caAnnuel >= biMetrics.caAnnuelN1 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                        {biMetrics.caAnnuel >= biMetrics.caAnnuelN1 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} 
                        {biMetrics.caAnnuelN1 > 0 ? ((biMetrics.caAnnuel - biMetrics.caAnnuelN1) / biMetrics.caAnnuelN1 * 100).toFixed(1) : (biMetrics.caAnnuel > 0 ? '100.0' : '0.0')}% vs N-1
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                    <div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)', display: 'block' }}>Trimestre courant :</span>
                      <strong style={{ fontSize: '9.5pt', color: 'var(--text-primary)' }}>
                        {loadingScore || edaDashboardLoading ? <Skeleton variant="text" width="60px" height="16px" /> : `${Math.round(biMetrics.caTrimestre).toLocaleString('fr-FR')} FCFA`}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)', display: 'block' }}>Mois courant :</span>
                      <strong style={{ fontSize: '9.5pt', color: 'var(--text-primary)' }}>
                        {loadingScore || edaDashboardLoading ? <Skeleton variant="text" width="60px" height="16px" /> : `${Math.round(biMetrics.caMensuel).toLocaleString('fr-FR')} FCFA`}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marges avec suivi de l'objectif */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Suivi des Marges</span>
                  <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Marge Brute :</span>
                      <div style={{ fontSize: '13pt', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {loadingScore || edaDashboardLoading ? <Skeleton variant="text" width="40px" height="20px" /> : `${biMetrics.margeBrute.toFixed(1)}%`}
                      </div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)' }}>Objectif : 40%</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Marge Nette :</span>
                      <div style={{ fontSize: '13pt', fontWeight: 700, color: '#f59e0b' }}>
                        {loadingScore || edaDashboardLoading ? <Skeleton variant="text" width="40px" height="20px" /> : `${biMetrics.margeNette.toFixed(1)}%`}
                      </div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)' }}>Objectif : 15%</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Avancement Obj. Marge Nette</span>
                      <span>{Math.min(100, Math.round((biMetrics.margeNette / 15) * 100))}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#1f2937', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, (biMetrics.margeNette / 15) * 100)}%`, 
                          height: '100%', 
                          background: biMetrics.margeNette >= 15 ? '#10b981' : '#f59e0b',
                          borderRadius: '3px' 
                        }} 
                      />
                      {/* Threshold marker for 15% */}
                      <div style={{ position: 'absolute', left: '100%', top: 0, width: '2px', height: '100%', background: '#ef4444' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* DSO & Créances Widget */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Créances Clients (DSO)</span>
                  <div style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>DSO Estimé :</span>
                      <div style={{ fontSize: '13pt', fontWeight: 700, color: dsoMetrics.dso > 30 ? '#ef4444' : '#10b981' }}>
                        {loadingScore || edaDashboardLoading ? <Skeleton variant="text" width="50px" height="20px" /> : `${dsoMetrics.dso} Jours`}
                      </div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)' }}>Objectif : &lt; 30j</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>En Souffrance :</span>
                      <div style={{ fontSize: '13pt', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {loadingScore || edaDashboardLoading ? <Skeleton variant="text" width="60px" height="20px" /> : <><>{dsoMetrics.encours >= 1000000 ? (dsoMetrics.encours / 1000000).toFixed(1) + 'M' : dsoMetrics.encours >= 1000 ? (dsoMetrics.encours / 1000).toFixed(1) + 'k' : dsoMetrics.encours}</> <span style={{fontSize: '9pt'}}>FCFA</span></>}
                      </div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)' }}>{dsoMetrics.count} facture{dsoMetrics.count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const amountStr = dsoMetrics.encours >= 1000000 ? (dsoMetrics.encours / 1000000).toFixed(1) + 'M FCFA' : dsoMetrics.encours >= 1000 ? (dsoMetrics.encours / 1000).toFixed(1) + 'k FCFA' : dsoMetrics.encours + ' FCFA';
                      const emailText = `Objet : Relance de paiement - Factures en souffrance\n\nBonjour,\n\nSauf erreur ou omission de notre part, nous constatons que certaines de vos factures (montant estimé : ${amountStr}) sont arrivées à échéance.\n\nPourriez-vous nous faire un retour sur l'état de leur règlement s'il vous plaît ?\nSi le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.\n\nCordialement,\nL'équipe Financière`;
                      navigator.clipboard.writeText(emailText).then(() => {
                        showToast("E-mail généré et copié !", "success");
                        setGeneratedEmailModal(emailText);
                      });
                    }}
                    style={{
                      marginTop: '4px',
                      padding: '8px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontSize: '8pt',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)' }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' }}
                  >
                    <MessageSquare size={14} />
                    Relance automatique
                  </button>
                </div>
              </div>

              {/* Trésorerie Projections 30/60/90J */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Projections de Solde</span>
                  <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={16} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: '6px', fontSize: '8.5pt' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Dans 30 jours (+30J)</span>
                      <strong style={{ color: biMetrics.proj30 < 500000 ? '#ef4444' : 'var(--text-primary)' }}>
                        {Math.round(biMetrics.proj30).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Dans 60 jours (+60J)</span>
                      <strong style={{ color: biMetrics.proj60 < 500000 ? '#ef4444' : 'var(--text-primary)' }}>
                        {Math.round(biMetrics.proj60).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Dans 90 jours (+90J)</span>
                      <strong style={{ color: biMetrics.proj90 < 500000 ? '#ef4444' : 'var(--text-primary)' }}>
                        {Math.round(biMetrics.proj90).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* MAIN CHART AND GAUGE GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              {/* CHART CARD */}
              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ margin: 0 }}>Prévisions de Trésorerie à 90 jours (Meta Prophet)</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '8.5pt', margin: '4px 0 0 0' }}>
                      Algorithme additif apprenant les saisonnalités sectorielles. Zone ombrée : Intervalle de confiance à 95%
                    </p>
                  </div>
                </div>

                {loadingForecast ? (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Skeleton width="100%" height="260px" />
                  </div>
                ) : currentPlan === 'starter' ? (
                  <div style={{ height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '12px', textAlign: 'center' }}>
                    <Lock size={32} style={{ color: 'var(--primary)' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11pt' }}>Prévisions IA de Trésorerie Verrouillées</div>
                    <p style={{ fontSize: '8.5pt', margin: 0, maxWidth: '280px', color: 'var(--text-muted)' }}>
                      Passez au forfait <strong>Pilote</strong> ou <strong>Croissance</strong> pour projeter votre trésorerie à 90 jours.
                    </p>
                    <button 
                      onClick={() => setActiveSection('billing')}
                      className="btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '8.5pt', marginTop: '8px', cursor: 'pointer' }}
                    >
                      Améliorer mon offre
                    </button>
                  </div>
                ) : forecast.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="areaGrad95" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.06" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                        </linearGradient>
                        <linearGradient id="areaGrad80" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.20" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {gridLinesY.map((g, i) => (
                        <g key={i}>
                          <line x1={paddingLeft} y1={g.y} x2={width - paddingRight} y2={g.y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                          <text x={paddingLeft - 10} y={g.y + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="8pt">{g.val}</text>
                        </g>
                      ))}

                      {gridLinesX.map((g, i) => (
                        <g key={i}>
                          <line x1={g.x} y1={paddingTop} x2={g.x} y2={height - paddingBottom} stroke="rgba(255,255,255,0.03)" />
                          <text x={g.x} y={height - paddingBottom + 20} textAnchor="middle" fill="var(--text-secondary)" fontSize="8pt">{g.label}</text>
                        </g>
                      ))}

                      {/* Highlighted tension zone: balance < 500 000 FCFA */}
                      <rect 
                        x={paddingLeft} 
                        y={getY(500000)} 
                        width={width - paddingLeft - paddingRight} 
                        height={Math.max(0, height - paddingBottom - getY(500000))} 
                        fill="rgba(239, 68, 68, 0.04)" 
                        stroke="rgba(239, 68, 68, 0.15)" 
                        strokeDasharray="3 3" 
                      />
                      <text x={paddingLeft + 10} y={getY(500000) - 6} fill="#f87171" fontSize="7pt" fontWeight="600">Seuil Critique (500 000 FCFA)</text>

                      <path d={svgAreaPoints95} fill="url(#areaGrad95)" />
                      <path d={svgAreaPoints80} fill="url(#areaGrad80)" />
                      <path d={svgPathPoints} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                      {hoveredIdx !== null && forecast[hoveredIdx] && (
                        <g>
                          <line x1={getX(hoveredIdx)} y1={paddingTop} x2={getX(hoveredIdx)} y2={height - paddingBottom} stroke="rgba(59,130,246,0.3)" strokeWidth="1" strokeDasharray="2 2" />
                          <circle cx={getX(hoveredIdx)} cy={getY(forecast[hoveredIdx].value)} r="6" fill="var(--primary)" stroke="#f8fafc" strokeWidth="2" />
                        </g>
                      )}

                      {forecast.map((_, i) => {
                        const cellWidth = (width - paddingLeft - paddingRight) / forecast.length;
                        return (
                          <rect
                            key={i}
                            x={getX(i) - cellWidth / 2}
                            y={paddingTop}
                            width={cellWidth}
                            height={height - paddingTop - paddingBottom}
                            fill="transparent"
                            cursor="crosshair"
                            onMouseEnter={(e) => {
                              setHoveredIdx(i);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipPos({ x: rect.left - 100, y: rect.top - 120 });
                            }}
                            onMouseLeave={() => setHoveredIdx(null)}
                          />
                        );
                      })}
                    </svg>

                    {hoveredIdx !== null && forecast[hoveredIdx] && (
                      <div style={{
                        position: 'fixed',
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                        background: '#111827',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        padding: '12px',
                        pointerEvents: 'none',
                        zIndex: 100,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        width: '200px'
                      }}>
                        <div style={{ fontSize: '8pt', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', textAlign: 'left' }}>
                          <Calendar size={12} />
                          {new Date(forecast[hoveredIdx].date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '10pt', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>
                          Solde : {Math.round(forecast[hoveredIdx].value).toLocaleString('fr-FR')} FCFA
                        </div>
                        <div style={{ fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'left' }}>
                          Confiance 80% : [{Math.round(forecast[hoveredIdx].lower_80 || forecast[hoveredIdx].lower_95 * 1.05).toLocaleString('fr-FR')} à {Math.round(forecast[hoveredIdx].upper_80 || forecast[hoveredIdx].upper_95 * 0.95).toLocaleString('fr-FR')}]
                        </div>
                        <div style={{ fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '2px', textAlign: 'left' }}>
                          Confiance 95% : [{Math.round(forecast[hoveredIdx].lower_95).toLocaleString('fr-FR')} à {Math.round(forecast[hoveredIdx].upper_95).toLocaleString('fr-FR')}]
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Aucune donnée de prévision disponible
                  </div>
                )}
              </div>

              {/* RISK GAUGE */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 16px 0', alignSelf: 'flex-start', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  Jauge de Score de Crédit
                </h3>
                
                {loadingScore ? (
                  <Skeleton variant="circular" width="120px" height="120px" />
                ) : currentPlan === 'starter' ? (
                  <div style={{ height: '130px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '8px', padding: '10px', textAlign: 'center' }}>
                    <Lock size={28} style={{ color: 'var(--primary)' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '9.5pt' }}>Score Crédit IA Verrouillé</div>
                    <p style={{ fontSize: '8pt', margin: 0, color: 'var(--text-muted)' }}>
                      Disponible en offre <strong>Pilote</strong> et <strong>Croissance</strong>.
                    </p>
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '130px', height: '130px', margin: 'auto' }}>
                    <svg width="130" height="130" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="8" />
                      <circle 
                        cx="60" 
                        cy="60" 
                        r="50" 
                        fill="none" 
                        stroke={getScoreColor(score?.score || 88)} 
                        strokeWidth="8" 
                        strokeDasharray="314" 
                        strokeDashoffset={314 - ((score?.score || 88) / 100) * 314}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: '130px', height: '130px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '22pt', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{score?.score || 88}</span>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>{score?.risk_segment || 'Faible'}</span>
                    </div>
                  </div>
                )}

                {currentPlan !== 'starter' && (
                  <div style={{ width: '100%', borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '8.5pt' }}>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Stabilité des flux</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {score?.features?.stability_index ? (score.features.stability_index * 100).toFixed(0) : '56'}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Indice d'activité</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {score?.features?.activity_index ? (score.features.activity_index * 100).toFixed(0) : '72'}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VISUALIZATIONS SECTION */}
            <h3 style={{ fontSize: '10pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', marginTop: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} style={{ color: 'var(--primary)' }} /> Visualisations Graphiques & Distribution BI
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', textAlign: 'left', marginBottom: '12px' }}>
              
              {/* CA 12 Months Evolution Curve */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '9.5pt', color: 'var(--text-primary)', fontWeight: 600 }}>Évolution du Chiffre d'Affaires</h4>
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Derniers mois d'activité (Mois glissants)</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '14px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
                  {biMetrics.monthlyCAEvolution.map((d, i) => {
                    const maxVal = Math.max(...biMetrics.monthlyCAEvolution.map(x => x.value), 1);
                    const heightPercent = (d.value / maxVal) * 80;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                        <div style={{ fontSize: '6.5pt', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {(d.value / 1000000).toFixed(1)}M
                        </div>
                        <div 
                          style={{ 
                            width: '100%', 
                            height: `${heightPercent}px`, 
                            maxHeight: '80px',
                            background: 'linear-gradient(to top, var(--primary-glow), var(--primary))', 
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.5s ease'
                          }} 
                        />
                        <span style={{ fontSize: '7pt', color: 'var(--text-secondary)', transform: 'rotate(-30deg)', whiteSpace: 'nowrap', marginTop: '4px' }}>
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Revenue breakdown by category */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '9.5pt', color: 'var(--text-primary)', fontWeight: 600 }}>Répartition des Revenus</h4>
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Répartition par catégorie de produit / service</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', flexGrow: 1 }}>
                  {biMetrics.revenueByCategory.map((d, i) => {
                    const totalRev = biMetrics.revenueByCategory.reduce((sum, x) => sum + x.value, 0);
                    const pct = totalRev > 0 ? (d.value / totalRev) * 100 : 0;
                    const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b'];
                    const color = colors[i % colors.length];

                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.category}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {Math.round(d.value).toLocaleString('fr-FR')} FCFA ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#1f2937', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Histogram of fixed vs variable charges */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '9.5pt', color: 'var(--text-primary)', fontWeight: 600 }}>Typologie des Charges</h4>
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Histogramme charges fixes vs variables (SYSCOHADA)</span>
                </div>

                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', justifyContent: 'center', flexGrow: 1, paddingBottom: '12px' }}>
                  {/* Fixed Charges Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '8pt', color: '#a855f7', fontWeight: 700 }}>
                      {((biMetrics.chargesFixes / (biMetrics.chargesFixes + biMetrics.chargesVariables || 1)) * 100).toFixed(0)}%
                    </div>
                    <div 
                      style={{ 
                        width: '44px', 
                        height: `${(biMetrics.chargesFixes / Math.max(biMetrics.chargesFixes, biMetrics.chargesVariables, 1)) * 90}px`, 
                        background: 'linear-gradient(to top, rgba(168,85,247,0.1), #a855f7)', 
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 0 15px rgba(168,85,247,0.1)'
                      }} 
                    />
                    <span style={{ fontSize: '8pt', color: 'var(--text-primary)', fontWeight: 600 }}>Fixes</span>
                    <span style={{ fontSize: '7pt', color: 'var(--text-secondary)' }}>{Math.round(biMetrics.chargesFixes / 1000).toLocaleString('fr-FR')} k FCFA</span>
                  </div>

                  {/* Variable Charges Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '8pt', color: '#f59e0b', fontWeight: 700 }}>
                      {((biMetrics.chargesVariables / (biMetrics.chargesFixes + biMetrics.chargesVariables || 1)) * 100).toFixed(0)}%
                    </div>
                    <div 
                      style={{ 
                        width: '44px', 
                        height: `${(biMetrics.chargesVariables / Math.max(biMetrics.chargesFixes, biMetrics.chargesVariables, 1)) * 90}px`, 
                        background: 'linear-gradient(to top, rgba(245,158,11,0.1), #f59e0b)', 
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 0 15px rgba(245,158,11,0.1)'
                      }} 
                    />
                    <span style={{ fontSize: '8pt', color: 'var(--text-primary)', fontWeight: 600 }}>Variables</span>
                    <span style={{ fontSize: '7pt', color: 'var(--text-secondary)' }}>{Math.round(biMetrics.chargesVariables / 1000).toLocaleString('fr-FR')} k FCFA</span>
                  </div>
                </div>
              </div>

              {/* Analyse Mensuelle des Dépenses */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '9.5pt', color: 'var(--text-primary)', fontWeight: 600 }}>Analyse Mensuelle des Dépenses</h4>
                    <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Répartition par mois glissants et catégories (débits uniquement)</span>
                  </div>
                </div>

                {monthlyExpenses.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '8.5pt' }}>
                    Aucune donnée de dépenses disponible pour cette période.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* SVG Bar Chart representing the expenses by month */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: '20px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative', marginTop: '12px' }}>
                      {monthlyExpenses.map((mItem, idx) => {
                        const maxExp = Math.max(...monthlyExpenses.map(x => x.total), 1);
                        const height = (mItem.total / maxExp) * 100;
                        const isHovered = hoveredIdx === idx + 500; // use an offset to avoid conflicts with other tooltips
                        return (
                          <div 
                            key={idx} 
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}
                            onMouseEnter={(e) => {
                              setHoveredIdx(idx + 500);
                              setTooltipPos({ x: e.currentTarget.offsetLeft + 10, y: e.currentTarget.offsetTop - 50 });
                            }}
                            onMouseLeave={() => setHoveredIdx(null)}
                          >
                            <div style={{ fontSize: '7pt', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              {Math.round(mItem.total).toLocaleString('fr-FR')} F
                            </div>
                            <div 
                              style={{ 
                                width: '100%', 
                                height: `${height}px`, 
                                maxHeight: '90px',
                                background: 'linear-gradient(to top, rgba(239, 68, 68, 0.15), var(--error))', 
                                borderRadius: '6px 6px 0 0',
                                transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isHovered ? '0 0 15px rgba(239,68,68,0.4)' : 'none',
                                cursor: 'pointer'
                              }} 
                            />
                            <span style={{ fontSize: '7.5pt', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {mItem.month}
                            </span>

                            {/* Tooltip containing category details */}
                            {isHovered && (
                              <div style={{
                                position: 'absolute',
                                bottom: '110%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(15, 23, 42, 0.95)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                width: '190px',
                                zIndex: 100,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                color: 'white',
                                fontSize: '7.5pt',
                                textAlign: 'left'
                              }}>
                                <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px', color: '#fda4af' }}>
                                  Détail {mItem.month}
                                </div>
                                {Object.entries(mItem.categories).map(([cat, val]: any) => (
                                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{cat} :</span>
                                    <span style={{ fontWeight: 600 }}>{Math.round(val).toLocaleString('fr-FR')} F</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* SECTION 2: TRANSACTIONS & CSV IMPORT */}
        {activeSection === 'transactions' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* LEDGER TABLE */}
            <Card 
              title="Journal d'Audit Financier Récent" 
              style={{ textAlign: 'left' }}
              hoverable={false}
            >
              {loadingTransactions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Skeleton width="100%" height="40px" />
                  <Skeleton width="100%" height="40px" />
                  <Skeleton width="100%" height="40px" />
                  <Skeleton width="100%" height="40px" />
                  <Skeleton width="100%" height="40px" />
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState
                  icon={<FileText size={32} />}
                  title="Aucun mouvement financier enregistré"
                  description="Téléversez votre premier document d'activité (CSV) ou enregistrez manuellement des mouvements pour commencer l'analyse de votre trésorerie."
                  actionLabel="Utiliser des données de démonstration"
                  onAction={() => {
                    const demoData = [
                      { id: 1, date: '2026-05-01', montant: '2500000', type: 'credit', categorie: 'Ventes', description: 'Facture client' },
                      { id: 2, date: '2026-05-05', montant: '800000', type: 'debit', categorie: 'Loyer', description: 'Loyer bureau' },
                      { id: 3, date: '2026-05-10', montant: '1200000', type: 'credit', categorie: 'Services Publics', description: 'Prestation Tech' }
                    ];
                    setTransactions(demoData as any);
                  }}
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Date</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Description</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Catégorie</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Montant</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{tx.date}</td>
                          <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{tx.description}</td>
                          <td style={{ padding: '12px' }}>
                            <Badge variant="secondary">{tx.categorie}</Badge>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: tx.type === 'credit' ? '#10b981' : '#f87171' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {tx.type === 'credit' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                              {Number(tx.montant).toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingTxId(tx.id);
                                  setTxImportMode('manual');
                                  setTxDate(tx.date);
                                  setTxMontant(tx.montant.toString());
                                  setTxType(tx.type === 'credit' ? 'credit' : 'debit');
                                  const isStandardCat = ["Ventes", "Salaires", "Loyer", "Achat Matières", "Marketing", "Impôts", "Services Publics"].includes(tx.categorie);
                                  if (isStandardCat) {
                                    setTxCategorie(tx.categorie);
                                    setCustomCategorie('');
                                  } else {
                                    setTxCategorie('Autre');
                                    setCustomCategorie(tx.categorie);
                                  }
                                  setTxDescription(tx.description || '');
                                }}
                                leftIcon={<Sliders size={12} style={{ transform: 'rotate(90deg)' }} />}
                                style={{ padding: '4px 8px' }}
                              >
                                Modifier
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setDeleteTxModal(tx.id)}
                                leftIcon={<X size={12} />}
                                style={{ padding: '4px 8px' }}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* IMPORT & MANUAL ENTRY CARD */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', height: 'fit-content', gap: '16px' }}>
              
              {/* Segmented Mode Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <button
                  onClick={() => { setTxImportMode('csv'); setTxSuccessMsg(''); setTxErrorMsg(''); }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: txImportMode === 'csv' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: txImportMode === 'csv' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: txImportMode === 'csv' ? 700 : 500,
                    fontSize: '9pt',
                    padding: '8px 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Import CSV
                </button>
                <button
                  onClick={() => { setTxImportMode('manual'); setTxSuccessMsg(''); setTxErrorMsg(''); }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: txImportMode === 'manual' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: txImportMode === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: txImportMode === 'manual' ? 700 : 500,
                    fontSize: '9pt',
                    padding: '8px 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Saisie Manuelle
                </button>
              </div>

              {txImportMode === 'csv' ? (
                <>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                      Import de Données (CSV)
                    </h3>
                    <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      Téléversez l'historique financier de votre PME pour alimenter la trésorerie et la note de confiance.
                    </p>
                  </div>

                  {/* CSV SPECIFICATIONS GUIDELINE */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '8pt', fontWeight: 700, color: '#f8fafc' }}>Format de fichier attendu :</span>
                    
                    {/* Micro Sample Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt', color: 'var(--text-secondary)' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ padding: '4px', textAlign: 'left' }}>date</th>
                          <th style={{ padding: '4px', textAlign: 'left' }}>montant</th>
                          <th style={{ padding: '4px', textAlign: 'left' }}>type</th>
                          <th style={{ padding: '4px', textAlign: 'left' }}>categorie</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '4px', color: '#60a5fa' }}>2026-06-01</td>
                          <td style={{ padding: '4px' }}>1500000</td>
                          <td style={{ padding: '4px', color: '#10b981' }}>credit</td>
                          <td style={{ padding: '4px' }}>Ventes</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px', color: '#60a5fa' }}>2026-06-05</td>
                          <td style={{ padding: '4px' }}>450000</td>
                          <td style={{ padding: '4px', color: '#ef4444' }}>debit</td>
                          <td style={{ padding: '4px' }}>Loyer</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Details list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '8pt', color: 'var(--text-muted)', lineHeight: 1.4, textAlign: 'left' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} style={{ color: '#60a5fa' }} />
                        <span><strong>date</strong> : format AAAA-MM-JJ (ex: 2026-06-01)</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp size={12} style={{ color: '#10b981' }} />
                        <span><strong>montant</strong> : nombre sans espaces ni FCFA (ex: 1500000)</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={12} style={{ color: '#f59e0b' }} />
                        <span><strong>type</strong> : obligatoirement <strong>credit</strong> (recette) ou <strong>debit</strong> (dépense)</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={12} style={{ color: '#a855f7' }} />
                        <span><strong>categorie</strong> : libellé libre (ex: Ventes, Salaires)</span>
                      </span>
                    </div>

                    <button 
                      onClick={downloadCSVTemplate}
                      className="btn-primary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '8.5pt',
                        fontWeight: 600,
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        marginTop: '4px'
                      }}
                    >
                      <Download size={14} />
                      Télécharger le modèle CSV
                    </button>
                  </div>
                  
                  <div style={{ position: 'relative', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '24px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', cursor: 'pointer' }}>
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={handleCSVUpload}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '9.5pt', color: 'var(--primary)', fontWeight: 600 }}>Sélectionner ou glisser mon fichier CSV</span>
                    <span style={{ display: 'block', fontSize: '7.5pt', color: 'var(--text-muted)', marginTop: '6px' }}>Cliquez pour parcourir votre ordinateur</span>
                  </div>
                  
                  {/* Security Reassurance Badge */}
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <Lock size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ fontSize: '9pt', color: '#10b981', margin: '0 0 4px 0', fontWeight: 600 }}>Connexion 100% Lecture Seule</h4>
                      <p style={{ fontSize: '8pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        PME Analytix ne peut que <strong>LIRE</strong> vos transactions pour les analyser. Aucun virement ou retrait n'est techniquement possible. Vos données sont chiffrées de bout en bout.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                      {editingTxId !== null ? "Modifier la Transaction" : "Saisie Manuelle"}
                    </h3>
                    <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {editingTxId !== null ? "Modifiez les champs de la transaction sélectionnée." : "Enregistrez manuellement une nouvelle transaction pour mettre à jour votre situation de trésorerie en temps réel."}
                    </p>
                  </div>

                  {/* Status notifications */}
                  {txSuccessMsg && (
                    <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', color: '#34d399', fontSize: '8.5pt', fontWeight: 500 }}>
                      {txSuccessMsg}
                    </div>
                  )}
                  {txErrorMsg && (
                    <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: '#f87171', fontSize: '8.5pt', fontWeight: 500 }}>
                      {txErrorMsg}
                    </div>
                  )}

                  {/* Date Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '8pt', fontWeight: 600, color: 'var(--text-secondary)' }}>Date de la Transaction *</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={e => setTxDate(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '9.5pt',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Montant Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '8pt', fontWeight: 600, color: 'var(--text-secondary)' }}>Montant (FCFA) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Ex: 500000"
                      value={txMontant}
                      onChange={e => setTxMontant(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '9.5pt',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Type Selector Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '8pt', fontWeight: 600, color: 'var(--text-secondary)' }}>Type de Flux *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setTxType('credit')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid ' + (txType === 'credit' ? '#10b981' : 'var(--card-border)'),
                          background: txType === 'credit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                          color: txType === 'credit' ? '#34d399' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '8.5pt',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                      >
                        Entrée (Crédit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxType('debit')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid ' + (txType === 'debit' ? '#ef4444' : 'var(--card-border)'),
                          background: txType === 'debit' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                          color: txType === 'debit' ? '#f87171' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '8.5pt',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                      >
                        Sortie (Débit)
                      </button>
                    </div>
                  </div>

                  {/* Catégorie Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '8pt', fontWeight: 600, color: 'var(--text-secondary)' }}>Catégorie *</label>
                    <select
                      required
                      value={txCategorie}
                      onChange={e => setTxCategorie(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '9.5pt',
                        outline: 'none'
                      }}
                    >
                      <option value="" disabled>Sélectionner une catégorie</option>
                      <option value="Ventes">Ventes de produits / Services</option>
                      <option value="Salaires">Salaires et Charges sociales</option>
                      <option value="Loyer">Loyer et Charges locatives</option>
                      <option value="Achat Matières">Achat de Matières / Marchandises</option>
                      <option value="Marketing">Marketing et Publicité</option>
                      <option value="Impôts">Impôts et Taxes</option>
                      <option value="Services Publics">Eau, Électricité, Internet</option>
                      <option value="Autre">Autre dépense / recette</option>
                    </select>

                    {txCategorie === 'Autre' && (
                      <input
                        type="text"
                        required
                        placeholder="Précisez la catégorie (ex: Assurance)"
                        value={customCategorie}
                        onChange={e => setCustomCategorie(e.target.value)}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '9.5pt',
                          outline: 'none',
                          marginTop: '4px'
                        }}
                      />
                    )}
                  </div>

                  {/* Description Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '8pt', fontWeight: 600, color: 'var(--text-secondary)' }}>Description (optionnelle)</label>
                    <input
                      type="text"
                      placeholder="Ex: Facture d'acompte client"
                      value={txDescription}
                      onChange={e => setTxDescription(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '9.5pt',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="submit"
                      disabled={txSubmitting}
                      className="btn-primary"
                      style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '9.5pt',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {txSubmitting ? 'Enregistrement...' : (editingTxId !== null ? 'Mettre à jour' : 'Enregistrer la Transaction')}
                    </button>
                    {editingTxId !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTxId(null);
                          setTxDate('');
                          setTxMontant('');
                          setTxCategorie('');
                          setCustomCategorie('');
                          setTxDescription('');
                        }}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '9.5pt',
                          fontWeight: 600,
                          background: 'rgba(255,255,255,0.03)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--card-border)',
                          cursor: 'pointer'
                        }}
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: CERTIFIED REPORTS */}
        {activeSection === 'reports' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* INITIATOR CARD */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', height: 'fit-content' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Générateur de Rapports</h3>
              <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                Lancez la compilation asynchrone (Celery) de votre rapport de solvabilité certifié aux normes OHADA avec signature électronique SHA-256 scellée.
              </p>

              <Button 
                onClick={triggerPDFGeneration} 
                disabled={generatingReport}
                loading={generatingReport}
                variant="primary" 
                style={{ width: '100%' }}
                leftIcon={<FileText size={16} />}
              >
                Générer un Rapport Certifié
              </Button>
            </div>

            {/* LIST OF HISTORICAL PDF REPORTS */}
            <div className="glass-card" style={{ textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Rapports Certifiés Générés</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingReports && reports.length === 0 ? (
                  <Skeleton height="80px" width="100%" />
                ) : reports.length > 0 ? (
                  reports.map((r, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '9.5pt' }}>Rapport #{r.id} ({r.date_generation})</span>
                        <span style={{ display: 'block', fontSize: '7.5pt', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace', maxWidth: '350px', textOverflow: 'ellipsis', overflow: 'hidden' }}>Signature SHA-256 : {r.signature || 'Aucune signature'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {r.statut === 'termine' ? (
                          <a 
                            href={`${BASE_API_URL}${r.url}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ width: '32px', height: '32px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}
                            title="Télécharger le rapport certifié"
                          >
                            <Download size={14} />
                          </a>
                        ) : r.statut === 'erreur' ? (
                          <span style={{ fontSize: '8pt', color: 'var(--danger)', fontWeight: 600 }}>Échec</span>
                        ) : (
                          <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                            <RefreshCw className="spin-anim" size={14} />
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteReport(r.id)}
                          style={{ width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}
                          title="Supprimer ce rapport certifié"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={<FileText size={32} />}
                    title="Aucun rapport généré"
                    description="Générez votre premier rapport OHADA certifié pour vos partenaires bancaires."
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: APPOINTMENTS & ADVISORY */}
        {activeSection === 'rendezvous' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* APPOINTMENTS LIST */}
            <div className="glass-card" style={{ textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                Vos Rendez-vous d'Audit & Financement
              </h3>

              {rendezvousList.length === 0 ? (
                <p style={{ fontSize: '9.5pt', color: 'var(--text-secondary)', margin: '16px 0' }}>
                  Aucun rendez-vous planifié. Vous pouvez prendre rendez-vous avec l'ADPME ou nos banques partenaires pour discuter de vos opportunités de crédit.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rendezvousList.map((r, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '10pt' }}>{r.partenaire}</span>
                        <span style={{ display: 'block', fontSize: '8pt', color: 'var(--text-secondary)', marginTop: '2px' }}>Motif : {r.motif}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '9.5pt', color: 'var(--primary)', fontWeight: 600 }}>Le {r.date} à {r.heure}</span>
                        <span style={{ 
                          fontSize: '7.5pt', 
                          color: '#10b981', 
                          background: 'rgba(16,185,129,0.1)', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginTop: '4px',
                          textTransform: 'capitalize',
                          fontWeight: 600
                        }}>
                          {r.statut}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* INLINE BOOKING PANEL */}
            <div className="glass-card" style={{ textAlign: 'left', height: 'fit-content' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                Planifier un Conseil
              </h3>

              <form onSubmit={handleBookRendezvous} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '8pt', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Partenaire</label>
                  <select 
                    value={rdvPartenaire}
                    onChange={e => setRdvPartenaire(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#f8fafc' }}
                  >
                    <option value="ADPME (Accompagnement)">ADPME (Accompagnement)</option>
                    <option value="Banque Atlantique (Financement)">Banque Atlantique (Financement)</option>
                    <option value="CGF Bourse (Investissement)">CGF Bourse (Investissement)</option>
                    <option value="BCEAO Analyste (Régulation)">BCEAO Analyste (Régulation)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8pt', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Motif</label>
                  <select 
                    value={rdvMotif}
                    onChange={e => setRdvMotif(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#f8fafc' }}
                  >
                    <option value="Accompagnement SYSCOHADA">Accompagnement SYSCOHADA</option>
                    <option value="Demande de Ligne de Crédit">Demande de Ligne de Crédit</option>
                    <option value="Analyse de Risque et Score">Analyse de Risque et Score</option>
                    <option value="Conseil en Trésorerie">Conseil en Trésorerie</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8pt', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Date</label>
                  <input 
                    type="date"
                    value={rdvDate}
                    onChange={e => setRdvDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#f8fafc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8pt', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Heure</label>
                  <input 
                    type="time"
                    value={rdvHeure}
                    onChange={e => setRdvHeure(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#f8fafc' }}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px 14px' }}>
                  Confirmer la Demande
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SECTION 5: PLANS & BILLING */}
        {activeSection === 'billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%', maxWidth: '960px', marginBottom: '24px' }}>
              
              {/* Starter (Gratuit) */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', border: currentPlan === 'starter' ? '2px solid var(--primary)' : '1px solid var(--card-border)', position: 'relative', textAlign: 'left' }}>
                {currentPlan === 'starter' && (
                  <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '2px 8px', fontSize: '7.5pt', fontWeight: 600 }}>Plan Actif</span>
                )}
                <h3 style={{ fontSize: '14pt', margin: 0, color: 'var(--text-primary)' }}>Starter</h3>
                <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', display: 'block' }}>Pour débuter</span>
                <div style={{ margin: '24px 0', fontSize: '24pt', fontWeight: 800, color: 'var(--text-primary)' }}>
                  0 FCFA <span style={{ fontSize: '10pt', fontWeight: 400, color: 'var(--text-secondary)' }}>/ à vie</span>
                </div>
                <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '9pt', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Visualisation des flux de trésorerie</li>
                  <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Prévisions à 90 jours (Prophet)</li>
                  <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Score de crédit (XGBoost)</li>
                  <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Rapports PDF certifiés</li>
                </ul>
                {currentPlan !== 'starter' && (
                  <button 
                    onClick={() => handleChangePlan('starter')} 
                    disabled={updatingPlan}
                    className="btn-primary" 
                    style={{ marginTop: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  >
                    Retrograder
                  </button>
                )}
              </div>

              {/* Pilote (Payant) */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', border: currentPlan === 'pilote' ? '2px solid var(--primary)' : '1px solid var(--card-border)', position: 'relative', textAlign: 'left' }}>
                {currentPlan === 'pilote' && (
                  <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '2px 8px', fontSize: '7.5pt', fontWeight: 600 }}>Plan Actif</span>
                )}
                <h3 style={{ fontSize: '14pt', margin: 0, color: 'var(--text-primary)' }}>Pilote</h3>
                <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', display: 'block' }}>Pour grandir</span>
                <div style={{ margin: '24px 0', fontSize: '24pt', fontWeight: 800, color: 'var(--text-primary)' }}>
                  15 000 FCFA <span style={{ fontSize: '10pt', fontWeight: 400, color: 'var(--text-secondary)' }}>/ mois</span>
                </div>
                <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '9pt', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Visualisation des flux de trésorerie</li>
                  <li>Prévisions Prophet (historique limité à 24 mois)</li>
                  <li>Score XGBoost (historique limité à 24 mois)</li>
                  <li>Génération de rapports certifiés (Payant à l'acte)</li>
                </ul>
                <button 
                  onClick={() => {
                    if (currentPlan === 'pilote') return;
                    handleChangePlan('pilote');
                  }} 
                  disabled={updatingPlan || currentPlan === 'pilote'}
                  className="btn-primary" 
                  style={{ marginTop: 'auto' }}
                >
                  {currentPlan === 'pilote' ? 'Abonnement Actif' : 'Payer en ligne (Visa, Wave)'}
                </button>
              </div>

              {/* Croissance (Payant) */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', border: currentPlan === 'croissance' ? '2px solid var(--primary)' : '1px solid var(--card-border)', position: 'relative', textAlign: 'left' }}>
                {currentPlan === 'croissance' && (
                  <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '2px 8px', fontSize: '7.5pt', fontWeight: 600 }}>Plan Actif</span>
                )}
                <h3 style={{ fontSize: '14pt', margin: 0, color: 'var(--text-primary)' }}>Croissance</h3>
                <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', display: 'block' }}>Pour dominer</span>
                <div style={{ margin: '24px 0', fontSize: '24pt', fontWeight: 800, color: 'var(--text-primary)' }}>
                  45 000 FCFA <span style={{ fontSize: '10pt', fontWeight: 400, color: 'var(--text-secondary)' }}>/ mois</span>
                </div>
                <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '9pt', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Visualisation & Historique de données illimités</li>
                  <li>Prévisions Prophet illimitées</li>
                  <li>Score crédit XGBoost illimité</li>
                  <li>Rapports certifiés PDF illimités et gratuits</li>
                  <li>Mise en relation et prise de rendez-vous Banques</li>
                </ul>
                <button 
                  onClick={() => {
                    if (currentPlan === 'croissance') return;
                    handleChangePlan('croissance');
                  }} 
                  disabled={updatingPlan || currentPlan === 'croissance'}
                  className="btn-primary" 
                  style={{ marginTop: 'auto', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' }}
                >
                  {currentPlan === 'croissance' ? 'Abonnement Actif' : 'Payer en ligne (Visa, Wave)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: SIMULATEUR DE CROISSANCE IA */}
        {activeSection === 'simulator' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
            
            {/* Header info */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ padding: '12px', background: 'var(--primary-glow)', borderRadius: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sliders size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '14pt', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Simulateur de Croissance IA</h3>
                <p style={{ fontSize: '9pt', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  Simulez l'impact financier de vos décisions stratégiques (marketing, recrutement, expansion régionale) sur votre Chiffre d'Affaires. Notre modèle IA calcule la trajectoire sur 12 mois, estime le point mort ajusté et détermine le délai de retour sur investissement (ROI).
                </p>
              </div>
            </div>

            {/* Split Grid: Inputs on Left, Key Outputs on Right */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              
              {/* Left Panel: Inputs */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '11pt', fontWeight: 700, color: '#f8fafc', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  Leviers de Croissance Stratégique
                </h4>
                
                {/* Marketing Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Budget Marketing (FCFA)</span>
                    <strong style={{ color: 'var(--primary)' }}>{simMarketing.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10000000" 
                    step="500000" 
                    value={simMarketing} 
                    onChange={(e) => setSimMarketing(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-muted)' }}>
                    Retour sur investissement estimé à 3.5x sur l'exercice glissant.
                  </span>
                </div>

                {/* Recruitment Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Investissement Recrutement Annuel</span>
                    <strong style={{ color: 'var(--primary)' }}>{simRecruit.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="20000000" 
                    step="1000000" 
                    value={simRecruit} 
                    onChange={(e) => setSimRecruit(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-muted)' }}>
                    Accroît la capacité productive (1.8x le coût opérationnel après 3 mois de formation).
                  </span>
                </div>

                {/* Expansion Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <input 
                    type="checkbox" 
                    id="simNewMarkets"
                    checked={simNewMarkets} 
                    onChange={(e) => setSimNewMarkets(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="simNewMarkets" style={{ cursor: 'pointer' }}>
                    <span style={{ fontSize: '9.5pt', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Expansion Nouveaux Marchés (UEMOA / CEDEAO)</span>
                    <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>
                      Augmente la base client de +30%. Ticket d'entrée fixe de 3 000 000 FCFA.
                    </span>
                  </label>
                </div>

                {/* Sales Growth Rate Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Ajustement Ventes (Croissance)</span>
                    <strong style={{ color: '#10b981' }}>{simRevenueGrowth > 0 ? '+' : ''}{simRevenueGrowth}%</strong>
                  </div>
                  <input 
                    type="range" 
                    min="-50" 
                    max="100" 
                    step="5" 
                    value={simRevenueGrowth} 
                    onChange={(e) => setSimRevenueGrowth(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-muted)' }}>
                    Simule un choc de demande macroéconomique ou commercial sur les crédits historiques.
                  </span>
                </div>

                {/* Expense Inflation Rate Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Ajustement Charges (Inflation)</span>
                    <strong style={{ color: '#f43f5e' }}>+{simExpenseInflation}%</strong>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    step="2" 
                    value={simExpenseInflation} 
                    onChange={(e) => setSimExpenseInflation(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#f43f5e', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-muted)' }}>
                    Simule une hausse générale des coûts de fonctionnement et d'approvisionnement.
                  </span>
                </div>

                {/* Simulation Button */}
                <div style={{ marginTop: '10px' }}>
                  <button 
                    onClick={handleRunStrategicSimulation} 
                    disabled={simulationLoading}
                    className="btn-primary" 
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      borderRadius: '8px', 
                      fontWeight: 700, 
                      fontSize: '9.5pt', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {simulationLoading ? (
                      <>
                        <RefreshCw size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                        Calcul de la trajectoire Prophet & XGBoost...
                      </>
                    ) : (
                      <>
                        <Sliders size={16} />
                        Lancer la Simulation IA
                      </>
                    )}
                  </button>

                  {simulationError && (
                    <div style={{ color: '#f87171', fontSize: '8pt', marginTop: '8px', padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                      {simulationError}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Metrics Summary */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '11pt', fontWeight: 700, color: '#f8fafc', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  Indicateurs ROI Financiers
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
                  {/* Total Invest */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)', display: 'block' }}>Investissement Total Engagé</span>
                      <strong style={{ fontSize: '13pt', color: 'var(--text-primary)' }}>{simResult.totalInvest.toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  </div>

                  {/* Return Period */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)', display: 'block' }}>Délai de Retour sur Investissement (ROI)</span>
                      <strong style={{ fontSize: '13pt', color: '#10b981' }}>{simResult.paybackPeriod}</strong>
                    </div>
                  </div>

                  {/* Point Mort */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)', display: 'block' }}>Nouveau Point Mort Mensuel</span>
                      <strong style={{ fontSize: '13pt', color: '#f59e0b' }}>{simResult.pointMortCA.toLocaleString('fr-FR')} FCFA / mois</strong>
                    </div>
                  </div>

                  {/* Credit Score Comparison */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)', display: 'block' }}>Impact Score de Crédit (XGBoost)</span>
                        {liveXgbSimulatedScore ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <strong style={{ fontSize: '11pt', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                              {liveXgbSimulatedScore.baseScore}
                            </strong>
                            <span style={{ fontSize: '10pt', color: 'var(--text-muted)' }}>➔</span>
                            <strong style={{ fontSize: '14pt', color: liveXgbSimulatedScore.score >= 80 ? '#10b981' : (liveXgbSimulatedScore.score >= 55 ? '#f59e0b' : '#ef4444') }}>
                              {liveXgbSimulatedScore.score} / 100
                            </strong>
                            <span style={{ 
                              fontSize: '7.5pt', 
                              fontWeight: 700, 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: liveXgbSimulatedScore.score >= 80 ? 'rgba(16,185,129,0.1)' : (liveXgbSimulatedScore.score >= 55 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'), 
                              color: liveXgbSimulatedScore.score >= 80 ? '#10b981' : (liveXgbSimulatedScore.score >= 55 ? '#f59e0b' : '#ef4444') 
                            }}>
                              Risque {liveXgbSimulatedScore.risk_segment}
                            </span>
                          </div>
                        ) : score ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <strong style={{ fontSize: '13pt', color: 'var(--text-primary)' }}>
                              {score.score} / 100
                            </strong>
                            <span style={{ 
                              fontSize: '7.5pt', 
                              fontWeight: 700, 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: score.score >= 80 ? 'rgba(16,185,129,0.1)' : (score.score >= 55 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'), 
                              color: score.score >= 80 ? '#10b981' : (score.score >= 55 ? '#f59e0b' : '#ef4444') 
                            }}>
                              Risque {score.risk_segment}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '8.5pt', color: 'var(--text-muted)', fontStyle: 'italic' }}>Non simulé (Lancez le calcul)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Card: Trajectory Line Graph */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '11pt', fontWeight: 700, color: '#f8fafc' }}>
                    {simChartMode === 'treasury' ? 'Prévisions de Trésorerie Stressées (90 jours)' : 'Trajectoire de CA Projetée (12 mois)'}
                  </h4>
                  <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>
                    {simChartMode === 'treasury' ? 'Simulation de liquidités Prophet sous contraintes' : 'Scénarios basés sur les investissements simulés'}
                  </span>
                </div>
                
                {/* Chart mode tabs */}
                {simulationApiResult && (
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                    <button 
                      onClick={() => setSimChartMode('ca')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '8pt',
                        fontWeight: 600,
                        border: 'none',
                        background: simChartMode === 'ca' ? 'var(--primary)' : 'transparent',
                        color: simChartMode === 'ca' ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Chiffre d'Affaires (12m)
                    </button>
                    <button 
                      onClick={() => setSimChartMode('treasury')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '8pt',
                        fontWeight: 600,
                        border: 'none',
                        background: simChartMode === 'treasury' ? 'var(--primary)' : 'transparent',
                        color: simChartMode === 'treasury' ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Trésorerie IA (90j)
                    </button>
                  </div>
                )}

                {/* Legends */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '8.5pt' }}>
                  {simChartMode === 'treasury' ? (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#a78bfa' }} /> Trésorerie de Référence
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} /> Trésorerie Simulée
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} /> Optimiste
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--primary)' }} /> Médian
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} /> Pessimiste
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* SVG Line Graph */}
              <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                {simChartMode === 'treasury' && simulationApiResult ? (() => {
                  const baseData = simulationApiResult.base.forecast || [];
                  const simData = simulationApiResult.simulated.forecast || [];
                  
                  if (baseData.length === 0 || simData.length === 0) {
                    return (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '9pt' }}>
                        Données de prévisions insuffisantes.
                      </div>
                    );
                  }

                  const width = 800;
                  const height = 220;
                  const paddingLeft = 70;
                  const paddingRight = 40;
                  const paddingTop = 20;
                  const paddingBottom = 30;

                  const values = [
                    ...baseData.map((d: any) => d.value),
                    ...simData.map((d: any) => d.value)
                  ];
                  const maxVal = Math.max(...values, 1000000);
                  const minVal = Math.min(...values, -100000);

                  const getX = (index: number) => paddingLeft + (index / (baseData.length - 1)) * (width - paddingLeft - paddingRight);
                  const getY = (val: number) => height - paddingBottom - ((val - minVal) / (maxVal - minVal || 1)) * (height - paddingTop - paddingBottom);

                  const basePath = baseData.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');
                  const simPath = simData.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');

                  // confidence area polygon for reference curve
                  const refAreaPoints = [
                    ...baseData.map((d: any, i: number) => `${getX(i)},${getY(d.upper_95 || d.value)}`),
                    ...baseData.slice().reverse().map((d: any, i: number) => `${getX(baseData.length - 1 - i)},${getY(d.lower_95 || d.value)}`)
                  ].join(' ');

                  return (
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                      {/* Confidence area */}
                      <polygon points={refAreaPoints} fill="rgba(167, 139, 250, 0.05)" />

                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const val = minVal + ratio * (maxVal - minVal);
                        const y = getY(val);
                        return (
                          <g key={idx}>
                            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                            <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="7pt">
                              {val >= 0 ? '' : '-'}{Math.abs(Math.round(val / 1000000)).toFixed(1)}M
                            </text>
                          </g>
                        );
                      })}

                      {/* X Labels */}
                      {baseData.map((d: any, i: number) => {
                        if (i % 30 !== 0 && i !== baseData.length - 1) return null;
                        return (
                          <text key={i} x={getX(i)} y={height - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="7.5pt">
                            {d.date.substring(5)}
                          </text>
                        );
                      })}

                      {/* Line paths */}
                      <path d={basePath} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="4 4" />
                      <path d={simPath} fill="none" stroke="#10b981" strokeWidth="3" />

                      {/* Endpoints dots */}
                      <circle cx={getX(baseData.length - 1)} cy={getY(baseData[baseData.length - 1].value)} r="4" fill="#a78bfa" />
                      <circle cx={getX(simData.length - 1)} cy={getY(simData[simData.length - 1].value)} r="5" fill="#10b981" />
                    </svg>
                  );
                })() : (
                  simResult.projections && simResult.projections.length > 0 ? (() => {
                    const width = 800;
                    const height = 220;
                    const paddingLeft = 60;
                    const paddingRight = 40;
                    const paddingTop = 20;
                    const paddingBottom = 30;

                    const values = [
                      ...simResult.projections.map(d => d.optimiste),
                      ...simResult.projections.map(d => d.pessimiste)
                    ];
                    const maxVal = Math.max(...values, 1000000);
                    const minVal = Math.min(...values, 100000);

                    const getX = (index: number) => paddingLeft + (index / (simResult.projections.length - 1)) * (width - paddingLeft - paddingRight);
                    const getY = (val: number) => height - paddingBottom - ((val - minVal) / (maxVal - minVal || 1)) * (height - paddingTop - paddingBottom);

                    // Paths
                    const optPath = simResult.projections.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.optimiste)}`).join(' ');
                    const medPath = simResult.projections.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.median)}`).join(' ');
                    const pesPath = simResult.projections.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.pessimiste)}`).join(' ');

                    return (
                      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const val = minVal + ratio * (maxVal - minVal);
                          const y = getY(val);
                          return (
                            <g key={idx}>
                              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="7pt">
                                {Math.round(val / 1000000).toFixed(1)}M
                              </text>
                            </g>
                          );
                        })}

                        {/* X Labels */}
                        {simResult.projections.map((d, i) => {
                          if (i % 2 !== 0 && i !== 11) return null;
                          return (
                            <text key={i} x={getX(i)} y={height - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="7.5pt">
                              {d.month}
                            </text>
                          );
                        })}

                        {/* Line paths */}
                        <path d={optPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 3" />
                        <path d={medPath} fill="none" stroke="var(--primary)" strokeWidth="3" />
                        <path d={pesPath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="3 3" />

                        {/* Endpoints dots */}
                        <circle cx={getX(11)} cy={getY(simResult.projections[11].optimiste)} r="5" fill="#10b981" />
                        <circle cx={getX(11)} cy={getY(simResult.projections[11].median)} r="5" fill="var(--primary)" />
                        <circle cx={getX(11)} cy={getY(simResult.projections[11].pessimiste)} r="5" fill="#ef4444" />
                      </svg>
                    );
                  })() : null
                )}
              </div>
            </div>
            
          </div>
        )}
        <Footer />
      </main>

      
            {/* Modal Edit Transaction */}
      {editTxModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '500px', maxWidth: '90%', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '11pt', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} style={{ color: 'var(--primary)' }} />
                Modifier la transaction
              </h3>
              <button onClick={() => setEditTxModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9pt', color: 'var(--text-secondary)' }}>Date</label>
                  <input type="date" value={editTxDate} onChange={(e) => setEditTxDate(e.target.value)} className="form-input" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9pt', color: 'var(--text-secondary)' }}>Montant (FCFA)</label>
                  <input type="number" value={editTxMontant} onChange={(e) => setEditTxMontant(e.target.value)} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9pt', color: 'var(--text-secondary)' }}>Type</label>
                  <select value={editTxType} onChange={(e) => setEditTxType(e.target.value as 'credit'|'debit')} className="form-select">
                    <option value="credit">Entrée d'argent (Crédit)</option>
                    <option value="debit">Dépense (Débit)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9pt', color: 'var(--text-secondary)' }}>Catégorie</label>
                  <select value={editTxCategorie} onChange={(e) => setEditTxCategorie(e.target.value)} className="form-select">
                    <option value="">Sélectionner...</option>
                    <option value="Ventes">Ventes</option>
                    <option value="Salaires">Salaires</option>
                    <option value="Loyer">Loyer</option>
                    <option value="Achat Matières">Achat Matières</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Impôts">Impôts</option>
                    <option value="Carburant">Carburant</option>
                    <option value="Entretien">Entretien</option>
                    <option value="Autre">Autre...</option>
                  </select>
                </div>
              </div>

              {editTxCategorie === 'Autre' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9pt', color: 'var(--text-secondary)' }}>Précisez la catégorie</label>
                  <input type="text" value={editTxCustomCategorie} onChange={(e) => setEditTxCustomCategorie(e.target.value)} placeholder="Ex: Fournitures" className="form-input" />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '9pt', color: 'var(--text-secondary)' }}>Description</label>
                <input type="text" value={editTxDescription} onChange={(e) => setEditTxDescription(e.target.value)} placeholder="Détails de la transaction" className="form-input" />
              </div>

            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={() => setEditTxModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '9pt', color: '#fff', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleSaveEdit} disabled={editTxSubmitting} className="btn-primary" style={{ padding: '8px 16px', fontSize: '9pt', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: editTxSubmitting ? 'not-allowed' : 'pointer' }}>
                {editTxSubmitting ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deleteTxModal !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '400px', maxWidth: '90%', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '11pt', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                Confirmer la suppression
              </h3>
            </div>
            <div style={{ padding: '24px', fontSize: '10pt', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Êtes-vous sûr de vouloir supprimer définitivement cette transaction ? Cette action est irréversible.
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={() => setDeleteTxModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '9pt', color: '#fff', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => confirmDeleteTransaction(deleteTxModal)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '9pt', display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Email Généré */}
      {generatedEmailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '500px', maxWidth: '90%', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '12pt', display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9' }}>
                <MessageSquare size={16} color="var(--primary)" />
                Relance IA générée
              </h3>
              <button onClick={() => setGeneratedEmailModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px', fontSize: '9.5pt', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {generatedEmailModal}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={() => setGeneratedEmailModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '9pt', color: '#fff', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Fermer
              </button>
              <button onClick={() => {
                navigator.clipboard.writeText(generatedEmailModal).then(() => showToast("Copié !", "success"));
              }} className="btn-primary" style={{ padding: '8px 16px', fontSize: '9pt', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                <Copy size={14} />
                Copier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SUPPORT CHAT WIDGET */}
      {renderFloatingChat()}

      {/* Toast Notifications Portal Container */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            style={{ 
              pointerEvents: 'auto',
              padding: '16px 24px', 
              borderRadius: '12px', 
              background: 'rgba(17, 24, 39, 0.95)', 
              border: `1px solid ${toast.type === 'success' ? 'var(--success)' : toast.type === 'error' ? 'var(--danger)' : 'var(--primary)'}`,
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '9.5pt',
              fontWeight: 500,
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <span style={{ fontSize: '14pt' }}>
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
