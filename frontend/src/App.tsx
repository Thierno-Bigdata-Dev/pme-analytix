import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from './services/api';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Input } from './components/ui/Input';
import { EmptyState } from './components/ui/EmptyState';
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
  DollarSign
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
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);
  
  // Loading states
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPlan, setCurrentPlan] = useState('starter');
  const [updatingPlan, setUpdatingPlan] = useState(false);
  
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

  // Chat Support states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: 'bot', text: 'Bonjour ! Je suis l\'assistant intelligent de PME Analytix. Je suis à votre écoute pour toute question technique ou réglementaire.' }
  ]);
  const [chatInput, setChatInput] = useState('');

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

    const proj30 = forecast.length >= 30 ? forecast[29].value : currentBalance * 0.98;
    const proj60 = forecast.length >= 60 ? forecast[59].value : currentBalance * 0.95;
    const proj90 = forecast.length >= 90 ? forecast[89].value : currentBalance * 0.92;

    return {
      caMensuel: caMensuelVal || 2700000,
      caMensuelN1: caMensuelN1Val || 2400000,
      caTrimestre: caTrimestreVal || 6400000,
      caTrimestreN1: caTrimestreN1Val || 5800000,
      caAnnuel: caAnnuelVal || 18900000,
      caAnnuelN1: caAnnuelN1Val || 17200000,
      margeBrute: margeBrute || 42.5,
      margeNette: margeNette || 18.2,
      proj30,
      proj60,
      proj90,
      chargesFixes: chargesFixes || 1750000,
      chargesVariables: chargesVariables || 2350000,
      monthlyCAEvolution: monthlyCAEvolution.length > 0 ? monthlyCAEvolution : [
        { label: 'Jan', value: 1200000 }, { label: 'Fév', value: 1500000 }, { label: 'Mar', value: 1800000 },
        { label: 'Avr', value: 1400000 }, { label: 'Mai', value: 2500000 }, { label: 'Jui', value: 2700000 }
      ],
      revenueByCategory: revenueByCategory.length > 0 ? revenueByCategory : [
        { category: 'Ventes Produits', value: 12000000 },
        { category: 'Prestations de Service', value: 5000000 },
        { category: 'Contrat ADPME', value: 1900000 }
      ]
    };
  }, [transactions, forecast, currentBalance]);

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
  }, [simMarketing, simRecruit, simNewMarkets, biMetrics]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.importCSV(pmeId, file);
      showToast(res.message || "Importation réussie !", "success");
      await loadDashboardData();
      setViewMode('pricing');
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

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?")) {
      return;
    }
    try {
      await api.deleteTransaction(pmeId, transactionId);
      await loadDashboardData();
    } catch (err: any) {
      showToast("Erreur lors de la suppression : " + err.message, "error");
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
        setChatMessages(prev => [...prev, { sender: 'bot', text: `Votre rendez-vous avec ${rdvPartenaire} le ${rdvDate} à ${rdvHeure} pour '${rdvMotif}' a été enregistré.` }]);
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
    try {
      txs = await api.getTransactions(currentPmeId);
      setTransactions(txs);
    } catch (err) {
      console.error("Transactions Error:", err);
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
    if (activePlan !== 'starter') {
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
        console.error("Score Error:", err);
        setErrorMsg("Impossible de charger le score crédit");
      } finally {
        setLoadingScore(false);
      }
    } else {
      setScore(null);
      setLoadingScore(false);
    }

    // 4. Load Treasury Forecast
    setLoadingForecast(true);
    if (activePlan !== 'starter') {
      try {
        const forecastData = await api.getTreasuryForecast(currentPmeId);
        if (forecastData.status === 'success') {
          setForecast(forecastData.forecast);
          setCurrentBalance(forecastData.current_balance);
        }
      } catch (err: any) {
        console.error("Forecast Error:", err);
      } finally {
        setLoadingForecast(false);
      }
    } else {
      setForecast([]);
      setLoadingForecast(false);
    }

    // 5. Load Reports list
    loadReportsList();

    // 6. Load Rendez-vous list
    try {
      const rdvData = await api.getRendezVous(currentPmeId);
      setRendezvousList(rdvData);
    } catch (err: any) {
      console.error("Rendezvous load error:", err);
    }

    // 7. Load Intelligent Alerts
    loadAlertsList(currentPmeId);

    // 8. Load Monthly Expenses Aggregation
    try {
      const expData = await api.getExpensesByMonth(currentPmeId);
      setMonthlyExpenses(expData);
    } catch (err: any) {
      console.error("Monthly Expenses Error:", err);
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
      console.error("Reports Error:", err);
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
    return (
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
        {/* Toggle Button */}
        <button 
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(59,130,246,0.3)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}
          className="hover-scale"
        >
          <MessageSquare size={24} />
        </button>

        {/* Chat window */}
        {chatOpen && (
          <div className="glass-card" style={{
            position: 'absolute',
            bottom: '72px',
            right: 0,
            width: '360px',
            height: '460px',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            {/* Header */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '10pt', display: 'block' }}>Conseiller PME Analytix</span>
                <span style={{ fontSize: '7.5pt', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                  En ligne
                </span>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Messages Body */}
            <div style={{ flexGrow: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#0b0f19' }}>
              {chatMessages.map((m, idx) => (
                <div 
                  key={idx} 
                  style={{
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: m.sender === 'user' ? 'var(--primary-glow)' : 'rgba(255,255,255,0.03)',
                    color: m.sender === 'user' ? 'var(--primary)' : 'var(--text-primary)',
                    border: m.sender === 'user' ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--card-border)',
                    padding: '10px 14px',
                    borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    maxWidth: '80%',
                    fontSize: '9pt',
                    lineHeight: 1.4,
                    textAlign: 'left'
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendChatMessage} style={{ padding: '12px', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Posez votre question..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                style={{ flexGrow: 1, padding: '8px 12px', background: '#111827', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt' }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: 'auto', padding: '8px 12px', fontSize: '9pt' }}
              >
                Envoyer
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  // 0. PUBLIC LANDING PAGE (UNAUTHENTICATED) WITH HOME, LOGIN, REGISTER, & ADMIN_LOGIN SUBVIEWS
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0f19', color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
        
        {/* Landing Header */}
        <header className="glass-card" style={{ margin: '24px 24px 0 24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
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
        <header className="glass-card" style={{ margin: '24px 24px 0 24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px' }}>
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
    
    const minVal = Math.min(...lowers, currentBalance) * 0.95;
    const maxVal = Math.max(...uppers, currentBalance) * 1.05;
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
        <header className="glass-card" style={{ margin: '24px 24px 0 24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
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
                  <h4 style={{ fontSize: '10.5pt', fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>Importez votre fichier financier</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Une fois sur votre tableau de bord, rendez-vous dans l'onglet <strong>"Transactions & Import"</strong> pour charger votre fichier d'activité (Excel ou CSV).
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
              <button 
                onClick={() => setViewMode('pricing')} 
                className="btn-primary" 
                style={{ padding: '14px 28px', fontSize: '10.5pt', fontWeight: 700, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' }}
              >
                Accéder à mon Tableau de Bord
              </button>
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
      <aside className={`glass-card sidebar-aside ${mobileSidebarOpen ? 'open' : ''}`}>
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
            onClick={() => { setActiveSection('eda'); setMobileSidebarOpen(false); }} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeSection === 'eda' ? 'var(--primary-glow)' : 'none', border: 'none', color: activeSection === 'eda' ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '9.5pt', width: '100%' }}
          >
            <BarChart3 size={18} /> Analyse Libre (EDA)
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
            {transactions.length === 0 && (
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
                        alert("Données de démonstration chargées temporairement. Vous pouvez explorer les graphiques et fonctionnalités !");
                      } catch (err) {
                        alert("Erreur lors du chargement des données.");
                      }
                    }} 
                  >
                    Utiliser des données de démonstration
                  </Button>
                </div>
              </Card>
            )}

            {/* INTELLIGENT ALERTS WIDGET */}
            {alerts && alerts.filter(a => a.statut === 'active').length > 0 && (
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
            )}

            {/* KPI ROW */}
            <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
              {/* Solde Card */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Trésorerie Actuelle</span>
                  <h2 style={{ fontSize: '20pt', fontWeight: 700, margin: '8px 0 0 0', color: 'var(--primary)' }}>
                    {currentBalance.toLocaleString('fr-FR')} <span style={{ fontSize: '12pt', fontWeight: 500 }}>FCFA</span>
                  </h2>
                  <span style={{ fontSize: '8pt', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Dernière transaction : 25/06/2026</span>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'var(--primary-glow)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <TrendingUp size={24} style={{ margin: 'auto' }} />
                </div>
              </div>

              {/* Liquidite Card */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '8.5pt', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>Indice de Liquidité (SYSCOHADA)</span>
                  <h2 style={{ fontSize: '20pt', fontWeight: 700, margin: '8px 0 0 0', color: '#10b981' }}>
                    {score?.features?.liquidity_ratio ? score.features.liquidity_ratio.toFixed(2) : '5.0'}
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
                    {score?.risk_segment || 'Faible'}
                  </h2>
                  <span style={{ fontSize: '8pt', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Score prédictif : {score?.score || 88}/100</span>
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
                      {Math.round(biMetrics.caAnnuel).toLocaleString('fr-FR')} FCFA
                      <span style={{ fontSize: '8.5pt', color: '#10b981', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                        <ArrowUpRight size={14} /> +9.8% vs N-1
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                    <div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)', display: 'block' }}>Trimestre courant :</span>
                      <strong style={{ fontSize: '9.5pt', color: 'var(--text-primary)' }}>{Math.round(biMetrics.caTrimestre).toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)', display: 'block' }}>Mois courant :</span>
                      <strong style={{ fontSize: '9.5pt', color: 'var(--text-primary)' }}>{Math.round(biMetrics.caMensuel).toLocaleString('fr-FR')} FCFA</strong>
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
                      <div style={{ fontSize: '13pt', fontWeight: 700, color: 'var(--text-primary)' }}>{biMetrics.margeBrute.toFixed(1)}%</div>
                      <span style={{ fontSize: '7pt', color: 'var(--text-secondary)' }}>Objectif : 40%</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Marge Nette :</span>
                      <div style={{ fontSize: '13pt', fontWeight: 700, color: '#f59e0b' }}>{biMetrics.margeNette.toFixed(1)}%</div>
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
                    <div className="shimmer" style={{ width: '80%', height: '80%' }}></div>
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
                  <div className="shimmer" style={{ width: '120px', height: '120px', borderRadius: '50%' }}></div>
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
              {transactions.length === 0 ? (
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
                                onClick={() => handleDeleteTransaction(tx.id)}
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

              <button 
                onClick={triggerPDFGeneration} 
                disabled={generatingReport}
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
              >
                {generatingReport ? (
                  <>
                    <RefreshCw className="spin-anim" size={16} /> Génération Celery...
                  </>
                ) : (
                  <>
                    <FileText size={16} /> Générer un Rapport Certifié
                  </>
                )}
              </button>
            </div>

            {/* LIST OF HISTORICAL PDF REPORTS */}
            <div className="glass-card" style={{ textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '11pt', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Rapports Certifiés Générés</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingReports && reports.length === 0 ? (
                  <div className="shimmer" style={{ height: '80px', width: '100%' }}></div>
                ) : reports.length > 0 ? (
                  reports.map((r, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '9.5pt' }}>Rapport #{r.id} ({r.date_generation})</span>
                        <span style={{ display: 'block', fontSize: '7.5pt', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace', maxWidth: '350px', textOverflow: 'ellipsis', overflow: 'hidden' }}>Signature SHA-256 : {r.signature || 'Aucune signature'}</span>
                      </div>
                      <div>
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
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '9.5pt' }}>
                    Aucun rapport généré pour le moment
                  </div>
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
                        {simulationApiResult ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <strong style={{ fontSize: '12pt', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                              {simulationApiResult.base.score}
                            </strong>
                            <span style={{ fontSize: '10pt', color: 'var(--text-muted)' }}>➔</span>
                            <strong style={{ fontSize: '14pt', color: simulationApiResult.simulated.score >= 80 ? '#10b981' : (simulationApiResult.simulated.score >= 55 ? '#f59e0b' : '#ef4444') }}>
                              {simulationApiResult.simulated.score} / 100
                            </strong>
                            <span style={{ 
                              fontSize: '7.5pt', 
                              fontWeight: 700, 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: simulationApiResult.simulated.score >= 80 ? 'rgba(16,185,129,0.1)' : (simulationApiResult.simulated.score >= 55 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'), 
                              color: simulationApiResult.simulated.score >= 80 ? '#10b981' : (simulationApiResult.simulated.score >= 55 ? '#f59e0b' : '#ef4444') 
                            }}>
                              Risque {simulationApiResult.simulated.risk_segment}
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

        {/* SECTION 6: EXPLORATORY DATA ANALYSIS (EDA) */}
        {activeSection === 'eda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
            {/* Header info */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Explorateur de Dataset Libre</h3>
              <p style={{ fontSize: '9pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Téléversez n'importe quel fichier CSV (données clients, ventes de voitures, stocks, etc.) pour en obtenir instantanément une analyse statistique descriptive complète : typage automatique, valeurs manquantes, visualisations des distributions numériques, répartitions catégorielles et matrice de corrélation de Pearson.
              </p>
            </div>

            {/* Dropzone Upload */}
            <div 
              className="glass-card"
              onDragOver={(e) => { e.preventDefault(); setEdaDragActive(true); }}
              onDragLeave={() => setEdaDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setEdaDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleEDAUpload(file);
              }}
              style={{
                border: edaDragActive ? '2px dashed var(--primary)' : '2px dashed var(--card-border)',
                background: edaDragActive ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.01)',
                padding: '40px',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => document.getElementById('eda-file-input')?.click()}
            >
              <input 
                id="eda-file-input"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleEDAUpload(file);
                }}
              />
              <UploadCloud size={40} style={{ color: edaLoading ? 'var(--primary)' : 'var(--text-secondary)', marginBottom: '16px', animation: edaLoading ? 'spin 2s linear infinite' : 'none' }} />
              {edaLoading ? (
                <div>
                  <h4 style={{ fontSize: '11pt', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Analyse en cours...</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0 }}>Pandas et Numpy explorent votre fichier...</p>
                </div>
              ) : (
                <div>
                  <h4 style={{ fontSize: '11pt', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Glissez-déposez votre CSV ou cliquez pour parcourir</h4>
                  <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0 }}>Tous les encodages (UTF-8, Latin-1) et séparateurs (virgule, point-virgule) sont supportés.</p>
                </div>
              )}
            </div>

            {edaError && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '9pt', textAlign: 'left' }}>
                {edaError}
              </div>
            )}

            {/* TABS SELECTOR */}
            {edaResult && (
              <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '8px' }}>
                <button 
                  onClick={() => setEdaTab('stats')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: edaTab === 'stats' ? '2px solid var(--primary)' : 'none',
                    color: edaTab === 'stats' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '10pt',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <TrendingUp size={14} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px' }} /> Exploration Statistique (EDA)
                </button>
                <button 
                  onClick={() => setEdaTab('dashboard')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: edaTab === 'dashboard' ? '2px solid var(--primary)' : 'none',
                    color: edaTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '10pt',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <BarChart3 size={14} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px' }} /> Tableau de Bord Dynamique (BI)
                </button>
                <button 
                  onClick={() => setEdaTab('prediction')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: edaTab === 'prediction' ? '2px solid var(--primary)' : 'none',
                    color: edaTab === 'prediction' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '10pt',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <TrendingUp size={14} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px' }} /> Modèle de Prédiction (ML)
                </button>
                <button 
                  onClick={() => setEdaTab('clean')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: edaTab === 'clean' ? '2px solid var(--primary)' : 'none',
                    color: edaTab === 'clean' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '10pt',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Sliders size={14} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px' }} /> Nettoyage & AutoML (DataPrep)
                </button>
              </div>
            )}

            {/* EDA Result Display */}
            {edaResult && edaTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Overview KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Fichier analysé</span>
                    <div style={{ fontSize: '12pt', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {edaResult.file_name}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Nombre de lignes</span>
                    <div style={{ fontSize: '18pt', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                      {edaResult.rows.toLocaleString()}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Nombre de colonnes</span>
                    <div style={{ fontSize: '18pt', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                      {edaResult.columns}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Cellules manquantes</span>
                    <div style={{ fontSize: '18pt', fontWeight: 800, color: edaResult.total_missing_pct > 10 ? '#f87171' : '#10b981', marginTop: '4px' }}>
                      {edaResult.total_missing_pct.toFixed(2)} %
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                    <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Lignes doublons</span>
                    <div style={{ fontSize: '18pt', fontWeight: 800, color: edaResult.duplicate_rows > 0 ? '#fbbf24' : '#10b981', marginTop: '4px' }}>
                      {edaResult.duplicate_rows}
                    </div>
                  </div>
                </div>

                {/* 2. Column Explorer */}
                <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
                  <h3 style={{ fontSize: '12pt', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Explorateur de Colonnes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {edaResult.columns_stats.map((col: any) => {
                      const isExpanded = expandedColumns[col.name];
                      return (
                        <div 
                          key={col.name} 
                          style={{
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.01)',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Toggle Header */}
                          <div 
                            onClick={() => setExpandedColumns(prev => ({ ...prev, [col.name]: !prev[col.name] }))}
                            style={{
                              padding: '14px 18px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              background: isExpanded ? 'rgba(255,255,255,0.02)' : 'none',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '10pt' }}>{col.name}</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '7.5pt',
                                background: col.type === 'numeric' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                                color: col.type === 'numeric' ? '#60a5fa' : '#c084fc',
                                border: col.type === 'numeric' ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(168,85,247,0.2)',
                                textTransform: 'capitalize'
                              }}>
                                {col.type === 'numeric' ? 'Numérique' : 'Catégoriel'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>
                                Vide : <strong style={{ color: col.missing_count > 0 ? '#f87171' : 'var(--text-secondary)' }}>{col.missing_pct.toFixed(1)}%</strong>
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div style={{ padding: '18px', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                              
                              {/* Statistics List */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <h4 style={{ fontSize: '9pt', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Statistiques Descriptives</h4>
                                {col.type === 'numeric' ? (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '8.5pt' }}>
                                    <div style={{ color: 'var(--text-secondary)' }}>Moyenne :</div>
                                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{col.mean !== null ? col.mean.toLocaleString(undefined, {maximumFractionDigits:2}) : 'N/A'}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Médiane :</div>
                                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{col.median !== null ? col.median.toLocaleString(undefined, {maximumFractionDigits:2}) : 'N/A'}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Écart-type :</div>
                                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{col.std !== null ? col.std.toLocaleString(undefined, {maximumFractionDigits:2}) : 'N/A'}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Min / Max :</div>
                                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{col.min !== null ? col.min.toLocaleString() : 'N/A'} / {col.max !== null ? col.max.toLocaleString() : 'N/A'}</div>
                                    {col.skewness !== undefined && col.skewness !== null && (
                                      <>
                                        <div style={{ color: 'var(--text-secondary)' }}>Asymétrie (Skewness) :</div>
                                        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{col.skewness.toFixed(3)}</div>
                                      </>
                                    )}
                                    {col.outliers_count !== undefined && col.outliers_count !== null && (
                                      <>
                                        <div style={{ color: 'var(--text-secondary)' }}>Outliers (Aberrants) :</div>
                                        <div style={{ fontWeight: 600, color: col.outliers_count > 0 ? '#f87171' : '#10b981' }}>{col.outliers_count}</div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '8.5pt' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>Valeurs uniques :</span>
                                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{col.unique_count}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>Taux de remplissage :</span>
                                      <span style={{ fontWeight: 600, color: '#10b981' }}>{(100 - col.missing_pct).toFixed(1)} %</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Visualization Area */}
                              <div>
                                <h4 style={{ fontSize: '9pt', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                                  {col.type === 'numeric' ? 'Distribution (Histogramme)' : 'Valeurs Dominantes (Top 5)'}
                                </h4>
                                
                                {col.type === 'numeric' && col.histogram ? (() => {
                                  const maxFreq = Math.max(...col.histogram.frequencies, 1);
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px', paddingBottom: '8px', borderBottom: '1px solid var(--card-border)' }}>
                                      {col.histogram.frequencies.map((freq: number, fIdx: number) => {
                                        const pctHeight = (freq / maxFreq) * 100;
                                        return (
                                          <div 
                                            key={fIdx}
                                            style={{
                                              flexGrow: 1,
                                              height: `${pctHeight}%`,
                                              background: 'linear-gradient(to top, var(--primary) 0%, #60a5fa 100%)',
                                              borderRadius: '2px 2px 0 0',
                                              minWidth: '12px',
                                              position: 'relative'
                                            }}
                                            title={`Tranche ${fIdx + 1}: ${freq} occurences`}
                                          />
                                        );
                                      })}
                                    </div>
                                  );
                                })() : null}

                                {col.type === 'categorical' && col.top_values ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {col.top_values.map((item: any, vIdx: number) => (
                                      <div key={vIdx} style={{ fontSize: '8pt' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f1f5f9', marginBottom: '2px' }}>
                                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%' }}>{item.value || '(Vide)'}</span>
                                          <span>{item.count} ({item.pct.toFixed(1)}%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                          <div style={{ width: `${item.pct}%`, height: '100%', background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', borderRadius: '3px' }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Pearson Correlation Heatmap */}
                {edaResult.correlation_matrix && edaResult.correlation_matrix.length > 0 && (() => {
                  const uniqueVars = Array.from(new Set(edaResult.correlation_matrix.map((c: any) => c.x))) as string[];
                  return (
                    <div className="glass-card" style={{ padding: '24px', textAlign: 'left', overflowX: 'auto' }}>
                      <h3 style={{ fontSize: '12pt', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Matrice de Corrélation de Pearson</h3>
                      <div style={{ minWidth: '500px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '8px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', width: '120px' }}>Variable</th>
                              {uniqueVars.map(v => (
                                <th key={v} style={{ padding: '8px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', textAlign: 'center', fontWeight: 600 }}>{v}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {uniqueVars.map(rowVar => (
                              <tr key={rowVar}>
                                <td style={{ padding: '8px', border: '1px solid var(--card-border)', fontWeight: 600, background: 'rgba(255,255,255,0.01)' }}>{rowVar}</td>
                                {uniqueVars.map(colVar => {
                                  const cell = edaResult.correlation_matrix.find((c: any) => c.x === rowVar && c.y === colVar);
                                  const val = cell ? cell.coef : 1.0;
                                  
                                  // Color scale between -1 (debit/red) and 1 (credit/green)
                                  let cellBg = 'rgba(255,255,255,0.02)';
                                  let cellColor = '#f8fafc';
                                  if (val !== null) {
                                    if (val > 0) {
                                      cellBg = `rgba(59,130,246, ${val})`; // Blue gradient for positive correlation
                                    } else if (val < 0) {
                                      cellBg = `rgba(239,68,68, ${Math.abs(val)})`; // Red gradient for negative correlation
                                    } else {
                                      cellBg = 'rgba(0,0,0,0.1)';
                                    }
                                    if (Math.abs(val) > 0.4) {
                                      cellColor = '#fff';
                                    }
                                  }
                                  
                                  return (
                                    <td 
                                      key={colVar} 
                                      style={{
                                        padding: '12px',
                                        border: '1px solid var(--card-border)',
                                        textAlign: 'center',
                                        background: cellBg,
                                        color: cellColor,
                                        fontWeight: 700
                                      }}
                                    >
                                      {val !== null ? val.toFixed(3) : '1.000'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Preview Table */}
                <div className="glass-card" style={{ padding: '24px', textAlign: 'left', overflowX: 'auto' }}>
                  <h3 style={{ fontSize: '12pt', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Aperçu des Données (10 premières lignes)</h3>
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          {Object.keys(edaResult.preview[0] || {}).map(k => (
                            <th key={k} style={{ padding: '10px 14px', borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {edaResult.preview.map((row: any, rIdx: number) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--card-border)', background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'none' }}>
                            {Object.values(row).map((val: any, vIdx: number) => (
                              <td key={vIdx} style={{ padding: '10px 14px', color: '#f1f5f9' }}>
                                {val === null ? <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>null</span> : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* BI DASHBOARD DISPLAY */}
            {edaResult && edaTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* BI Selectors Panel */}
                <div className="glass-card" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', textAlign: 'left' }}>
                  
                  {/* Metric Select */}
                  <div>
                    <label style={{ fontSize: '8pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Métrique (Numérique)</label>
                    <select 
                      value={edaMetric}
                      onChange={(e) => {
                        const m = e.target.value;
                        setEdaMetric(m);
                        handleUpdateEDADashboard({ metric: m, dimension: edaDimension, secondaryDimension: edaSecondaryDimension || undefined, dateCol: edaDateCol || undefined, aggregation: edaAggregation });
                      }}
                      style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                    >
                      {edaResult.columns_stats.filter((c: any) => c.type === 'numeric').map((c: any) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Dimension Select */}
                  <div>
                    <label style={{ fontSize: '8pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Dimension Majeure (Axe X)</label>
                    <select 
                      value={edaDimension}
                      onChange={(e) => {
                        const d = e.target.value;
                        setEdaDimension(d);
                        handleUpdateEDADashboard({ metric: edaMetric, dimension: d, secondaryDimension: edaSecondaryDimension || undefined, dateCol: edaDateCol || undefined, aggregation: edaAggregation });
                      }}
                      style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                    >
                      {edaResult.columns_stats.filter((c: any) => c.type === 'categorical').map((c: any) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Secondary Dimension Select */}
                  <div>
                    <label style={{ fontSize: '8pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Dimension Mineure (Donut)</label>
                    <select 
                      value={edaSecondaryDimension}
                      onChange={(e) => {
                        const sd = e.target.value;
                        setEdaSecondaryDimension(sd);
                        handleUpdateEDADashboard({ metric: edaMetric, dimension: edaDimension, secondaryDimension: sd || undefined, dateCol: edaDateCol || undefined, aggregation: edaAggregation });
                      }}
                      style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                    >
                      <option value="">Aucune</option>
                      {edaResult.columns_stats.filter((c: any) => c.type === 'categorical').map((c: any) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Column Select */}
                  <div>
                    <label style={{ fontSize: '8pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Colonne Temporelle</label>
                    <select 
                      value={edaDateCol}
                      onChange={(e) => {
                        const dc = e.target.value;
                        setEdaDateCol(dc);
                        handleUpdateEDADashboard({ metric: edaMetric, dimension: edaDimension, secondaryDimension: edaSecondaryDimension || undefined, dateCol: dc || undefined, aggregation: edaAggregation });
                      }}
                      style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                    >
                      <option value="">Aucune</option>
                      {edaResult.columns_stats.map((c: any) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Aggregation Select */}
                  <div>
                    <label style={{ fontSize: '8pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Calcul</label>
                    <select 
                      value={edaAggregation}
                      onChange={(e) => {
                        const agg = e.target.value;
                        setEdaAggregation(agg);
                        handleUpdateEDADashboard({ metric: edaMetric, dimension: edaDimension, secondaryDimension: edaSecondaryDimension || undefined, dateCol: edaDateCol || undefined, aggregation: agg });
                      }}
                      style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                    >
                      <option value="mean">Moyenne</option>
                      <option value="sum">Somme</option>
                    </select>
                  </div>

                </div>

                {edaDashboardError && (
                  <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '9pt', textAlign: 'left' }}>
                    {edaDashboardError}
                  </div>
                )}

                {edaDashboardLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
                    <RefreshCw size={36} className="spin" style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '9.5pt', color: 'var(--text-secondary)' }}>Agrégation dynamique des données en cours...</span>
                  </div>
                ) : edaDashboardResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* BI KPIs grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                        <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Moyenne de {edaMetric}</span>
                        <div style={{ fontSize: '16pt', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                          {edaDashboardResult.kpis.mean !== null ? edaDashboardResult.kpis.mean.toLocaleString(undefined, {maximumFractionDigits: 1}) : 'N/A'}
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                        <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Somme de {edaMetric}</span>
                        <div style={{ fontSize: '16pt', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                          {edaDashboardResult.kpis.sum !== null ? edaDashboardResult.kpis.sum.toLocaleString(undefined, {maximumFractionDigits: 0}) : 'N/A'}
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                        <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Valeur Minimum</span>
                        <div style={{ fontSize: '16pt', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
                          {edaDashboardResult.kpis.min !== null ? edaDashboardResult.kpis.min.toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                        <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Valeur Maximum</span>
                        <div style={{ fontSize: '16pt', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                          {edaDashboardResult.kpis.max !== null ? edaDashboardResult.kpis.max.toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
                        <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Enregistrements total</span>
                        <div style={{ fontSize: '16pt', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                          {edaDashboardResult.kpis.count.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Chart Layout row 1 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
                      
                      {/* Chart 1: Bar Chart breakdown */}
                      <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                          {edaAggregation === 'mean' ? 'Moyenne' : 'Somme'} de {edaMetric} par {edaDimension} (Top 8)
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
                          {edaDashboardResult.dimension_breakdown.length === 0 ? (
                            <span style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', textAlign: 'center' }}>Aucune donnée à afficher.</span>
                          ) : (
                            edaDashboardResult.dimension_breakdown.map((item: any, idx: number) => {
                              const vals = edaDashboardResult.dimension_breakdown.map((i: any) => i.value || 0);
                              const maxVal = Math.max(...vals, 1);
                              const pct = Math.max(((item.value || 0) / maxVal) * 100, 2);
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', color: 'var(--text-primary)' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{item.category || '(Vide)'}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.value !== null ? item.value.toLocaleString(undefined, {maximumFractionDigits: 1}) : 'N/A'}</span>
                                  </div>
                                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, #60a5fa 100%)', borderRadius: '4px' }} />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Chart 2: Donut Chart breakdown */}
                      <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                          Répartition des lignes par {edaSecondaryDimension || 'Dimension Mineure'}
                        </h4>
                        {!edaSecondaryDimension ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, border: '1px dashed var(--card-border)', borderRadius: '8px', padding: '24px', fontSize: '8.5pt', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Veuillez sélectionner une "Dimension Mineure" ci-dessus pour afficher la répartition.
                          </div>
                        ) : edaDashboardResult.secondary_breakdown.length === 0 ? (
                          <span style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto' }}>Aucune donnée à afficher.</span>
                        ) : (() => {
                          const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f43f5e'];
                          let cumPct = 0;
                          const conicParts = edaDashboardResult.secondary_breakdown.map((item: any, idx: number) => {
                            const color = COLORS[idx % COLORS.length];
                            const start = cumPct;
                            cumPct += item.pct;
                            return `${color} ${start}% ${cumPct}%`;
                          }).join(', ');
                          
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexGrow: 1 }}>
                              {/* Circular Donut via CSS */}
                              <div style={{
                                width: '130px',
                                height: '130px',
                                borderRadius: '50%',
                                background: `conic-gradient(${conicParts})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                flexShrink: 0
                              }}>
                                <div style={{
                                  width: '78px',
                                  height: '78px',
                                  borderRadius: '50%',
                                  background: '#0d1320',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '7.5pt',
                                  color: 'var(--text-secondary)',
                                  fontWeight: 600
                                }}>
                                  Total : {edaDashboardResult.kpis.count}
                                </div>
                              </div>

                              {/* Legends */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                                {edaDashboardResult.secondary_breakdown.map((item: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '8pt' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px', color: '#f1f5f9' }} title={item.category}>{item.category || '(Vide)'}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{item.pct.toFixed(1)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                    </div>

                    {/* Chart Layout row 2: Trend line (rendered if selected) */}
                    {edaDateCol && edaDashboardResult.trend && edaDashboardResult.trend.length > 0 && (() => {
                      const trendItems = edaDashboardResult.trend;
                      const vals = trendItems.map((t: any) => t.value || 0);
                      const maxVal = Math.max(...vals, 1);
                      const minVal = Math.min(...vals, 0);
                      const range = maxVal - minVal || 1;
                      
                      const width = 800;
                      const height = 120;
                      
                      // Calculate point string for SVG
                      const points = trendItems.map((t: any, idx: number) => {
                        const x = (idx / (trendItems.length - 1)) * width;
                        const y = height - (((t.value || 0) - minVal) / range) * height;
                        return `${x},${y}`;
                      }).join(' ');
                      
                      // Polygon fill path
                      const fillPoints = `${points} ${width},${height} 0,${height}`;
                      
                      return (
                        <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                            Évolution de {edaMetric} dans le temps (Axe : {edaDateCol})
                          </h4>
                          
                          {/* SVG line graph */}
                          <div style={{ width: '100%', position: 'relative' }}>
                            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '140px', overflow: 'visible' }}>
                              <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              
                              {/* Horizontal grids */}
                              <line x1="0" y1="0" x2={width} y2="0" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                              <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                              <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.1)" />
                              
                              {/* Area fill */}
                              <polygon points={fillPoints} fill="url(#trendGrad)" />
                              
                              {/* Line path */}
                              <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
                              
                              {/* Draw dots */}
                              {trendItems.length < 25 && trendItems.map((t: any, idx: number) => {
                                const x = (idx / (trendItems.length - 1)) * width;
                                const y = height - (((t.value || 0) - minVal) / range) * height;
                                return (
                                  <circle 
                                    key={idx} 
                                    cx={x} 
                                    cy={y} 
                                    r="3.5" 
                                    fill="#f8fafc" 
                                    stroke="var(--primary)" 
                                    strokeWidth="2" 
                                  >
                                    <title>{`${t.date}: ${t.value.toLocaleString()}`}</title>
                                  </circle>
                                );
                              })}
                            </svg>
                            
                            {/* X Labels */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', color: 'var(--text-secondary)', marginTop: '8px', padding: '0 4px' }}>
                              <span>{trendItems[0]?.date}</span>
                              <span>{trendItems[Math.floor(trendItems.length / 2)]?.date}</span>
                              <span>{trendItems[trendItems.length - 1]?.date}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Leaderboard Table (Top 10 items) */}
                    <div className="glass-card" style={{ padding: '24px', textAlign: 'left', overflowX: 'auto' }}>
                      <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>
                        Leaderboard : Top 10 Enregistrements (triés par {edaMetric} max)
                      </h4>
                      <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', textAlign: 'left' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '10px 14px', borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: 600, width: '40px' }}>Rank</th>
                              <th style={{ padding: '10px 14px', borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>{edaDimension} (Dim Majeure)</th>
                              {edaSecondaryDimension && (
                                <th style={{ padding: '10px 14px', borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>{edaSecondaryDimension} (Dim Mineure)</th>
                              )}
                              <th style={{ padding: '10px 14px', borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>{edaMetric} (Valeur Métrique)</th>
                              {/* Render other headers */}
                              {Object.keys(edaDashboardResult.leaderboard[0] || {}).filter(k => k !== edaDimension && k !== edaSecondaryDimension && k !== edaMetric).slice(0, 3).map(k => (
                                <th key={k} style={{ padding: '10px 14px', borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {edaDashboardResult.leaderboard.map((row: any, rIdx: number) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid var(--card-border)', background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'none' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>#{rIdx + 1}</td>
                                <td style={{ padding: '10px 14px', color: '#f1f5f9', fontWeight: 600 }}>{row[edaDimension] !== null ? String(row[edaDimension]) : 'null'}</td>
                                {edaSecondaryDimension && (
                                  <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>{row[edaSecondaryDimension] !== null ? String(row[edaSecondaryDimension]) : 'null'}</td>
                                )}
                                <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 700 }}>
                                  {row[edaMetric] !== null ? Number(row[edaMetric]).toLocaleString() : 'null'}
                                </td>
                                {/* Other cells */}
                                {Object.keys(row).filter(k => k !== edaDimension && k !== edaSecondaryDimension && k !== edaMetric).slice(0, 3).map((k, cIdx) => (
                                  <td key={cIdx} style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                                    {row[k] !== null ? String(row[k]) : 'null'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--card-border)', borderRadius: '8px' }}>
                    Impossible de charger le tableau de bord décisionnel. Assurez-vous d'avoir configuré vos axes ci-dessus.
                  </div>
                )}

              </div>
            )}

            {/* ML PREDICTOR VIEW DISPLAY */}
            {edaResult && edaTab === 'prediction' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Model Training Form (if not trained yet) */}
                {!mlTrainingResult && (
                  <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '12pt', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>Entraîner un Modèle Prédictif No-Code</h4>
                      <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        Sélectionnez la colonne que vous souhaitez que l'IA estime (Cible) et cochez les caractéristiques (Variables explicatives) que le modèle doit prendre en compte.
                      </p>
                    </div>

                    {mlTrainingError && (
                      <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '9pt' }}>
                        {mlTrainingError}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      
                      {/* Left side: target and algorithm */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cible à prédire (Target)</label>
                          <select 
                            value={mlTarget}
                            onChange={(e) => {
                              const t = e.target.value;
                              setMlTarget(t);
                              // Auto-remove target from features
                              setMlFeatures(prev => prev.filter(f => f !== t));
                            }}
                            style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                          >
                            {edaResult.columns_stats.filter((c: any) => c.type === 'numeric').map((c: any) => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Algorithme d'apprentissage</label>
                          <select 
                            value={mlAlgo}
                            onChange={(e) => setMlAlgo(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                          >
                            <option value="forest">Forêt Aléatoire (Random Forest Regressor) — Recommandé</option>
                            <option value="linear">Régression Linéaire Multiple (Linear Regression)</option>
                          </select>
                        </div>
                      </div>

                      {/* Right side: features check list */}
                      <div>
                        <label style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                          Variables prédictives à inclure ({mlFeatures.length} sélectionnées)
                        </label>
                        <div style={{ 
                          maxHeight: '160px', 
                          overflowY: 'auto', 
                          border: '1px solid var(--card-border)', 
                          borderRadius: '6px', 
                          padding: '10px 14px', 
                          background: '#0b0f19',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {edaResult.columns_stats.map((col: any) => {
                            if (col.name === mlTarget) return null;
                            const isChecked = mlFeatures.includes(col.name);
                            return (
                              <label key={col.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '8.5pt', color: '#cbd5e1' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setMlFeatures(prev => prev.filter(f => f !== col.name));
                                    } else {
                                      setMlFeatures(prev => [...prev, col.name]);
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span>{col.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '7.5pt' }}>({col.type === 'numeric' ? 'Num' : 'Cat'})</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    <button 
                      onClick={handleTrainPredictor}
                      disabled={mlTrainingLoading || !mlTarget || mlFeatures.length === 0}
                      className="btn-primary"
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        fontSize: '9.5pt', 
                        fontWeight: 700, 
                        marginTop: '12px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {mlTrainingLoading ? (
                        <>
                          <RefreshCw size={16} className="spin" />
                          Apprentissage du modèle en cours (calcul des splits et fit)...
                        </>
                      ) : (
                        <>
                          <TrendingUp size={16} /> Entraîner le Modèle de Prédiction
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 2. Model Trained Performance and Simulator Form */}
                {mlTrainingResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Metrics and feature importances */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                      
                      {/* Metrics Card */}
                      <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Performances du Modèle</h4>
                          <button 
                            onClick={() => setMlTrainingResult(null)}
                            style={{ padding: '4px 8px', fontSize: '8pt', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                          >
                            Ré-entraîner
                          </button>
                        </div>

                        {/* R2 circular gauge / progress bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: 'var(--text-primary)', fontWeight: 600 }}>
                            <span>Précision Globale (R²)</span>
                            <span style={{ color: '#10b981' }}>{(mlTrainingResult.metrics.r2 * 100).toFixed(1)} %</span>
                          </div>
                          <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(mlTrainingResult.metrics.r2 * 100, 2)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', borderRadius: '5px' }} />
                          </div>
                          <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                            Le coefficient R² représente la part de variance de {mlTarget} expliquée par les variables choisies.
                          </span>
                        </div>

                        {/* MAE and RMSE grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Erreur Moyenne (MAE)</span>
                            <div style={{ fontSize: '13pt', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                              {mlTrainingResult.metrics.mae.toLocaleString(undefined, {maximumFractionDigits: 1})}
                            </div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '7.5pt', color: 'var(--text-secondary)' }}>Erreur Quadratique (RMSE)</span>
                            <div style={{ fontSize: '13pt', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                              {mlTrainingResult.metrics.rmse.toLocaleString(undefined, {maximumFractionDigits: 1})}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Feature importances */}
                      <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Impact des Caractéristiques (Contributions)</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', flexGrow: 1 }}>
                          {mlTrainingResult.importances
                            .sort((a: any, b: any) => b.importance - a.importance)
                            .map((item: any, idx: number) => {
                              const pct = Math.max(item.importance * 100, 2);
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', color: 'var(--text-primary)' }}>
                                    <span>{item.feature}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{(item.importance * 100).toFixed(1)}%</span>
                                  </div>
                                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, #c084fc 100%)', borderRadius: '3px' }} />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                    </div>

                    {/* Simulation Simulator Interface */}
                    <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
                      
                      {/* Left: Input parameters */}
                      <div>
                        <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>Simulateur de Prédiction</h4>
                        <form onSubmit={handleRunPrediction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {mlTrainingResult.feature_specs.map((spec: any) => (
                            <div key={spec.name}>
                              <label style={{ fontSize: '8pt', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                {spec.name} {spec.type === 'numeric' && `(${spec.min} - ${spec.max})`}
                              </label>
                              {spec.type === 'numeric' ? (
                                <input 
                                  type="number"
                                  step="any"
                                  value={simulatorInputs[spec.name] ?? ''}
                                  min={spec.min}
                                  max={spec.max}
                                  onChange={(e) => setSimulatorInputs({ ...simulatorInputs, [spec.name]: e.target.value })}
                                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                                />
                              ) : (
                                <select 
                                  value={simulatorInputs[spec.name] ?? ''}
                                  onChange={(e) => setSimulatorInputs({ ...simulatorInputs, [spec.name]: e.target.value })}
                                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', fontWeight: 500 }}
                                >
                                  {spec.options.map((opt: string) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ))}

                          <button 
                            type="submit" 
                            disabled={mlPredictLoading}
                            className="btn-primary" 
                            style={{ 
                              width: '100%', 
                              padding: '10px', 
                              fontSize: '9pt', 
                              fontWeight: 700, 
                              marginTop: '8px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            {mlPredictLoading ? <RefreshCw size={14} className="spin" /> : null}
                            Estimer la valeur {mlTarget}
                          </button>
                        </form>
                      </div>

                      {/* Right: Results Display */}
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
                        {mlPredictError && (
                          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '9pt', width: '100%' }}>
                            {mlPredictError}
                          </div>
                        )}

                        {mlPredictionVal !== null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '8pt', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Estimation IA de {mlTarget}</span>
                            <div style={{ fontSize: '24pt', fontWeight: 900, color: '#10b981', textShadow: '0 0 15px rgba(16,185,129,0.3)' }}>
                              {mlPredictionVal.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            </div>
                            <span style={{ fontSize: '7.5pt', color: 'var(--text-muted)', marginTop: '8px' }}>
                              Calculé en {mlAlgo === 'forest' ? 'Forêt Aléatoire' : 'Régression Linéaire'} avec une précision globale estimée de {(mlTrainingResult.metrics.r2 * 100).toFixed(1)}%.
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                            <Sliders size={32} style={{ color: 'var(--text-secondary)' }} />
                            <span style={{ fontSize: '9pt', fontWeight: 600 }}>Simulateur d'estimation IA</span>
                            <p style={{ fontSize: '8pt', margin: 0, color: 'var(--text-muted)', maxWidth: '240px' }}>
                              Renseignez les critères du formulaire de gauche et cliquez sur le bouton vert pour estimer la valeur en temps réel.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                )}
              </div>
            )}

            {edaResult && edaTab === 'clean' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {!cleanEdaResult ? (
                      <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                          <h4 style={{ fontSize: '12pt', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Configuration du Nettoyage Automatisé</h4>
                          <p style={{ fontSize: '9pt', color: 'var(--text-secondary)', margin: 0 }}>
                            Configurez les stratégies d'imputation et de détection d'anomalies pour générer un dataset propre prêt à l'analyse.
                          </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '8px' }}>
                          {/* Drop duplicates */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '9.5pt', fontWeight: 600, color: '#f8fafc' }}>Doublons</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '9pt', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '6px' }}>
                              <input 
                                type="checkbox" 
                                checked={edaDropDuplicates} 
                                onChange={(e) => setEdaDropDuplicates(e.target.checked)} 
                                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                              />
                              Supprimer les lignes doublons
                            </label>
                          </div>

                          {/* Impute numeric */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '9.5pt', fontWeight: 600, color: '#f8fafc' }}>Valeurs Numériques Manquantes</span>
                            <select 
                              value={edaImputeNumeric}
                              onChange={(e) => setEdaImputeNumeric(e.target.value)}
                              style={{ padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', marginTop: '6px' }}
                            >
                              <option value="median">Imputer avec la Médiane (Recommandé)</option>
                              <option value="mean">Imputer avec la Moyenne</option>
                              <option value="zero">Remplacer par 0</option>
                              <option value="drop">Supprimer les lignes vides</option>
                              <option value="none">Ne rien faire</option>
                            </select>
                          </div>

                          {/* Impute categorical */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '9.5pt', fontWeight: 600, color: '#f8fafc' }}>Valeurs Catégorielles Manquantes</span>
                            <select 
                              value={edaImputeCategorical}
                              onChange={(e) => setEdaImputeCategorical(e.target.value)}
                              style={{ padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', marginTop: '6px' }}
                            >
                              <option value="mode">Imputer avec le Mode (Plus fréquent)</option>
                              <option value="missing_label">Remplacer par 'Inconnu'</option>
                              <option value="drop">Supprimer les lignes vides</option>
                              <option value="none">Ne rien faire</option>
                            </select>
                          </div>

                          {/* Outliers */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '9.5pt', fontWeight: 600, color: '#f8fafc' }}>Gestion des Outliers (Extrêmes)</span>
                            <select 
                              value={edaHandleOutliers}
                              onChange={(e) => setEdaHandleOutliers(e.target.value)}
                              style={{ padding: '8px 10px', background: '#0b0f19', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#f8fafc', fontSize: '9pt', marginTop: '6px' }}
                            >
                              <option value="cap">Limiter aux bornes IQR (Capping)</option>
                              <option value="drop">Supprimer les lignes outliers</option>
                              <option value="none">Conserver les outliers</option>
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={handleCleanEDA}
                          disabled={edaCleanLoading}
                          className="btn-primary"
                          style={{ padding: '12px 24px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '9.5pt', marginTop: '10px' }}
                        >
                          {edaCleanLoading ? <RefreshCw size={14} className="spin" /> : <Sliders size={14} />}
                          Lancer le Nettoyage Automatisé & l'Analyse Bivariée
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Before vs After comparison stats */}
                        <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <div>
                              <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Rapport Comparatif d'Inspection</h4>
                              <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Comparaison des métriques clés avant et après traitement</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => {
                                  const blob = new Blob([cleanEdaResult.cleaned_csv_content], { type: 'text/csv;charset=utf-8;' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.setAttribute('href', url);
                                  link.setAttribute('download', `cleaned_${edaFile?.name || 'dataset.csv'}`);
                                  link.style.visibility = 'hidden';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="btn-primary"
                                style={{ padding: '8px 16px', fontSize: '8.5pt', fontWeight: 600, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Download size={14} /> Télécharger le CSV Nettoyé
                              </button>
                              <button
                                onClick={() => setCleanEdaResult(null)}
                                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: '#f8fafc', borderRadius: '6px', fontSize: '8.5pt', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Réinitialiser
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Lignes (Rows)</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                                <span style={{ fontSize: '14pt', fontWeight: 700, color: 'var(--text-secondary)' }}>{cleanEdaResult.raw_stats.rows.toLocaleString()}</span>
                                <span style={{ fontSize: '10pt', color: 'var(--text-muted)' }}>→</span>
                                <span style={{ fontSize: '16pt', fontWeight: 800, color: 'var(--primary)' }}>{cleanEdaResult.clean_stats.rows.toLocaleString()}</span>
                              </div>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Doublons</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                                <span style={{ fontSize: '14pt', fontWeight: 700, color: cleanEdaResult.raw_stats.duplicate_rows > 0 ? '#fbbf24' : 'var(--text-secondary)' }}>{cleanEdaResult.raw_stats.duplicate_rows}</span>
                                <span style={{ fontSize: '10pt', color: 'var(--text-muted)' }}>→</span>
                                <span style={{ fontSize: '16pt', fontWeight: 800, color: '#10b981' }}>{cleanEdaResult.clean_stats.duplicate_rows}</span>
                              </div>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '8pt', color: 'var(--text-secondary)' }}>Cellules Vides (Missing)</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                                <span style={{ fontSize: '14pt', fontWeight: 700, color: cleanEdaResult.raw_stats.total_missing_pct > 0 ? '#f87171' : 'var(--text-secondary)' }}>{cleanEdaResult.raw_stats.total_missing_pct.toFixed(1)}%</span>
                                <span style={{ fontSize: '10pt', color: 'var(--text-muted)' }}>→</span>
                                <span style={{ fontSize: '16pt', fontWeight: 800, color: '#10b981' }}>{cleanEdaResult.clean_stats.total_missing_pct.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                          {/* Left: Treatment Log */}
                          <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Journal des Traitements Appliqués</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                              {cleanEdaResult.report.length > 0 ? (
                                cleanEdaResult.report.map((log: string, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '8.5pt', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '10px 12px', borderRadius: '6px' }}>
                                    <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                                    <span>{log}</span>
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: '9pt', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                  Aucun nettoyage requis. Le dataset est déjà propre.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Bivariate & Correlation Insights */}
                          <div className="glass-card" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Analyse Bivariée & Corrélations</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                              {cleanEdaResult.bivariate_insights && cleanEdaResult.bivariate_insights.length > 0 ? (
                                cleanEdaResult.bivariate_insights.map((ins: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '9pt', fontWeight: 700, color: '#f8fafc' }}>
                                        {ins.x} × {ins.y}
                                      </span>
                                      <span style={{ fontSize: '8pt', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                                        {ins.metric}
                                      </span>
                                    </div>
                                    <p style={{ fontSize: '8.5pt', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                                      {ins.description}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: '9pt', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                  Pas d'insights bivariés détectés. Ajoutez d'autres colonnes numériques/catégorielles.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Preview Table of Cleaned Data */}
                        <div className="glass-card" style={{ padding: '24px', textAlign: 'left', overflow: 'hidden' }}>
                          <h4 style={{ fontSize: '11pt', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>Aperçu du Dataset Nettoyé (10 premières lignes)</h4>
                          <div style={{ overflowX: 'auto', border: '1px solid var(--card-border)', borderRadius: '6px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', color: 'var(--text-secondary)' }}>
                              <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                                  {cleanEdaResult.clean_stats.columns_stats.map((col: any) => (
                                    <th key={col.name} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                                      {col.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {cleanEdaResult.clean_stats.preview.map((row: any, rIdx: number) => (
                                  <tr key={rIdx} style={{ borderBottom: rIdx < cleanEdaResult.clean_stats.preview.length - 1 ? '1px solid var(--card-border)' : 'none', background: rIdx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'none' }}>
                                    {cleanEdaResult.clean_stats.columns_stats.map((col: any) => (
                                      <td key={col.name} style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                        {row[col.name] !== null ? String(row[col.name]) : <span style={{ color: '#f87171', fontWeight: 600 }}>N/A</span>}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
        <Footer />
      </main>

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
