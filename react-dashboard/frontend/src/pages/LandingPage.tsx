import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Menu, 
  X, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Mic,
  Brain,
  BarChart3,
  Phone,
  Globe,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Pricing configuration
const plans = {
  free: { label: 'Free', priceEUR: 0, minSeats: 1 },
  starter: { label: 'Starter', priceEUR: 12, minSeats: 5 },
  pro: { label: 'Pro', priceEUR: 29, minSeats: 25, recommended: true },
  enterprise: { label: 'Enterprise', priceEUR: null, platformFeeEUR: 1000, priceNote: 'od €45–65 / uživ. + €1 000 platforma', minSeats: 100 },
} as const;

const channelAddonUSD = { web: 5, whatsapp: 10, phone: 20 } as const;
type ChannelKey = keyof typeof channelAddonUSD;

type Limits = { webrtcMin: number | string; pstnMin: number | string; whatsappMsgs: number | string; ttsChars: number | string; sttMin: number | string };

const limits: Record<keyof typeof plans, Limits> = {
  free:        { webrtcMin: 20,  pstnMin: 5,   whatsappMsgs: 25,   ttsChars: '10 000',  sttMin: 15 },
  starter:     { webrtcMin: 50,  pstnMin: 20,  whatsappMsgs: 100,  ttsChars: '30 000',  sttMin: 60 },
  pro:         { webrtcMin: 200, pstnMin: 80,  whatsappMsgs: 400,  ttsChars: '75 000',  sttMin: 240 },
  enterprise:  { webrtcMin: '500+', pstnMin: '200+', whatsappMsgs: '1 000+', ttsChars: '200 000+', sttMin: '600+' },
};

const features: Record<keyof typeof plans, string[]> = {
  free: [
    'Základní agent (1 scénář)',
    '1 kurz, mikro‑testy',
    'Základní analytics',
    'Komunitní podpora',
  ],
  starter: [
    'Realtime voice agent',
    '3 kurzy, role‑play 1‑persona',
    'Základní dashboard',
    'E‑mail export výsledků, webhooky',
  ],
  pro: [
    'Adaptivní kurikulum, multijazyčnost (cz/en/de)',
    'Role‑play multi‑persona, scoring a rubriky',
    'SSO (SAML/OIDC), SCORM/xAPI export',
    'Integrace: BambooHR, Personio, Google Workspace',
    'Audit logy, SLA 99.5 %',
  ],
  enterprise: [
    'White‑label, EU data residency, DPA/GDPR',
    'RBAC, VPC / privátní endpointy, BYO‑keys (Twilio/Meta/OpenAI/ElevenLabs)',
    'Dedikované SLA 99.9 %, account manager',
    'Sandbox/preview prostředí',
  ],
};

interface PricingCardProps {
  planKey: keyof typeof plans;
  selectedChannel: ChannelKey;
  onChannelChange: (channel: ChannelKey) => void;
}

const PricingCard: React.FC<PricingCardProps> = ({ planKey, selectedChannel, onChannelChange }) => {
  const [showDetails, setShowDetails] = useState(false);
  const plan = plans[planKey];
  const planLimits = limits[planKey];
  const planFeatures = features[planKey];

  const getChannelIcon = (channel: ChannelKey) => {
    switch (channel) {
      case 'web': return <Globe className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
    }
  };

  const getChannelLabel = (channel: ChannelKey) => {
    switch (channel) {
      case 'web': return 'Web/App hovory (WebRTC)';
      case 'whatsapp': return 'WhatsApp hovory/zprávy';
      case 'phone': return 'Telefonní hovory (PSTN)';
    }
  };

  return (
    <div className={`card card-pricing ${plan.recommended ? 'recommended' : ''}`}>
      <div className="text-center">
        <h3 className="heading text-2xl font-semibold mb-2">{plan.label}</h3>
        <div className="mb-4">
          {plan.priceEUR !== null ? (
            <div>
              <span className="text-4xl font-bold">€{plan.priceEUR}</span>
              <span className="text-muted"> / uživatel</span>
              <div className="text-sm text-muted mt-1">
                + kanál od ${channelAddonUSD[selectedChannel]} / měsíc
              </div>
            </div>
          ) : (
            <div className="text-lg font-medium">{plan.priceNote}</div>
          )}
        </div>

        {/* Channel Selection */}
        <div className="channel-selector">
          {Object.keys(channelAddonUSD).map((channel) => (
            <div
              key={channel}
              className={`channel-option ${selectedChannel === channel ? 'selected' : ''}`}
              onClick={() => onChannelChange(channel as ChannelKey)}
            >
              {getChannelIcon(channel as ChannelKey)}
              <div className="text-xs mt-1">od ${channelAddonUSD[channel as ChannelKey]}</div>
            </div>
          ))}
        </div>

        <div className="text-sm text-muted mb-6">
          Min. {plan.minSeats} {plan.minSeats === 1 ? 'uživatel' : 'uživatelů'}
        </div>

        <motion.button
          className={`btn ${planKey === 'enterprise' ? 'btn-secondary' : 'btn-primary'} w-full mb-4`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (planKey === 'enterprise') {
              window.location.href = 'mailto:info@synqflows.com?subject=Enterprise%20Plan%20Inquiry';
            } else {
              window.location.href = '/register';
            }
          }}
        >
          {planKey === 'enterprise' ? 'Kontaktovat obchod' : 'Začít zdarma'}
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        {/* Accordion Details */}
        <div className="pricing-accordion">
          <button
            className="pricing-accordion-header"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>Zobrazit detaily</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showDetails && (
            <div className="pricing-accordion-content">
              <div className="text-left">
                <h4 className="font-semibold mb-3">Limity ({selectedChannel}):</h4>
                <ul className="text-sm space-y-1 mb-4">
                  <li>WebRTC: {planLimits.webrtcMin} min</li>
                  <li>PSTN: {planLimits.pstnMin} min</li>
                  <li>WhatsApp: {planLimits.whatsappMsgs} zpráv</li>
                  <li>TTS: {planLimits.ttsChars} znaků</li>
                  <li>STT: {planLimits.sttMin} min</li>
                </ul>

                <h4 className="font-semibold mb-3">Klíčové funkce:</h4>
                <ul className="text-sm space-y-1">
                  {planFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Record<keyof typeof plans, ChannelKey>>({
    free: 'web',
    starter: 'web', 
    pro: 'whatsapp',
    enterprise: 'phone'
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const handleChannelChange = (planKey: keyof typeof plans, channel: ChannelKey) => {
    setSelectedChannels(prev => ({
      ...prev,
      [planKey]: channel
    }));
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <motion.header 
        className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-muted-dark"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <Link to="/" className="heading text-2xl font-bold text-accent">
              AI Lektor
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/login" className="btn btn-ghost">
                Přihlášení
              </Link>
              <Link to="/register" className="btn btn-primary">
                Registrace
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden py-4 border-t border-muted-dark"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex flex-col gap-4">
                <Link to="/login" className="btn btn-ghost">
                  Přihlášení
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Registrace
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="section-lg relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(13, 27, 42, 0.4) 0%, rgba(13, 27, 42, 0.6) 50%, rgba(13, 27, 42, 0.8) 100%), url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`
          }}
        />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <motion.h1 
              className="heading text-5xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              AI Lektor – osobní hlasový trenér pro vzdělávání
            </motion.h1>
            
            <motion.p 
              className="body text-xl md:text-2xl mb-8 text-white/90"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Adaptivní výuka hlasem. Reálné konverzace. Měřitelný pokrok.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link to="/register" className="btn btn-primary btn-lg">
                Vyzkoušet zdarma
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg text-white border-white/30 hover:bg-white/10">
                Přihlásit se
              </Link>
            </motion.div>

            <motion.p 
              className="text-sm text-white/70 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              Po přihlášení přejdete do dashboardu.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="heading text-4xl font-bold mb-4">Popis projektu AI Lektor</h2>
            <p className="body text-xl text-muted max-w-3xl mx-auto">
              Revoluční platforma pro personalizované vzdělávání pomocí umělé inteligence a hlasového rozhraní
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-8 h-8 text-accent" />,
                title: 'Adaptivní výuka',
                description: 'Tempo a obtížnost se přizpůsobuje vašim znalostem a pokroku v reálném čase.'
              },
              {
                icon: <Mic className="w-8 h-8 text-accent" />,
                title: 'Hlasové rozhraní', 
                description: 'Přirozené konverzace přes telefon, WebRTC nebo WhatsApp s pokročilou AI.'
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-accent" />,
                title: 'Analytika pokroku',
                description: 'Detailní reporty a doporučení pro optimalizaci vašeho vzdělávacího procesu.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="card card-feature"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="heading text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="body text-muted">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section bg-muted">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="heading text-4xl font-bold mb-6">O nás</h2>
              <p className="body text-lg mb-4">
                AI Lektor vznikl z potřeby revolutionizovat firemní vzdělávání. Kombinujeme nejnovější technologie 
                umělé inteligence s hlubokým porozuměním vzdělávacích procesů.
              </p>
              <p className="body text-lg text-muted">
                Naše platforma umožňuje vytváření personalizovaných vzdělávacích zkušeností, 
                které se přizpůsobují každému jednotlivci a poskytují měřitelné výsledky.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="heading text-4xl font-bold mb-6">Vize a mise</h2>
              <p className="body text-lg mb-4">
                Naší vizí je svět, kde je kvalitní vzdělávání dostupné každému, kdykoli a kdekoli. 
                Věříme v sílu personalizovaného učení podporovaného etickou umělou inteligencí.
              </p>
              <p className="body text-lg text-muted">
                Zavazujeme se k transparentnosti, ochraně soukromí a vytváření technologií, 
                které skutečně slouží lidskému rozvoji.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="heading text-4xl font-bold mb-4">Cenové plány</h2>
            <p className="body text-xl text-muted max-w-3xl mx-auto mb-4">
              Vyberte si plán, který nejlépe odpovídá potřebám vaší organizace
            </p>
            <p className="text-sm text-muted">
              Ceny jsou orientační, bez DPH. Fakturace měsíčně.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Object.keys(plans).map((planKey, index) => (
              <motion.div
                key={planKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <PricingCard 
                  planKey={planKey as keyof typeof plans}
                  selectedChannel={selectedChannels[planKey as keyof typeof plans]}
                  onChannelChange={(channel) => handleChannelChange(planKey as keyof typeof plans, channel)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* References Section */}
      <section className="section bg-muted">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="heading text-4xl font-bold mb-4">Reference & inspirace</h2>
            <p className="body text-xl text-muted">
              Organizace, které nás inspirují a motivují k excelenci
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'YPO', url: 'https://www.ypo.org/', description: 'Young Presidents\' Organization' },
              { name: 'Aspironix', url: 'https://www.aspironix.com/', description: 'Technology Innovation' },
              { name: 'SynQFlows', url: 'https://www.synqflows.com/', description: 'Process Automation' }
            ].map((reference, index) => (
              <motion.a
                key={index}
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card text-center hover:scale-105 transition-transform"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                  <ExternalLink className="w-8 h-8 text-accent" />
                </div>
                <h3 className="heading text-xl font-semibold mb-2">{reference.name}</h3>
                <p className="body text-muted">{reference.description}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-sm bg-primary text-white">
        <div className="container">
          <div className="text-center">
            <div className="mb-6">
              <Link to="/" className="heading text-2xl font-bold text-accent">
                AI Lektor
              </Link>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 mb-6">
              <a href="mailto:info@synqflows.com" className="hover:text-accent transition-colors">
                Kontakt
              </a>
              <a href="/terms" className="hover:text-accent transition-colors">
                Podmínky
              </a>
              <a href="/privacy" className="hover:text-accent transition-colors">
                Ochrana soukromí
              </a>
            </div>
            
            <p className="text-white/70 text-sm">
              © 2024 AI Lektor. Všechna práva vyhrazena.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 