import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Phone, 
  MessageSquare, 
  Monitor,
  Mail,
  Building2
} from 'lucide-react';

// Plan definitions according to the prompt
const plans = {
  free: { 
    label: 'Free', 
    priceEUR: 0, 
    minSeats: 1,
    description: 'Pro solo testování MVP'
  },
  starter: { 
    label: 'Starter', 
    priceEUR: 12, 
    minSeats: 5,
    description: 'Malé týmy, pilot'
  },
  pro: { 
    label: 'Pro', 
    priceEUR: 29, 
    minSeats: 25, 
    recommended: true,
    description: 'Škálování ve firmě'
  },
  enterprise: { 
    label: 'Enterprise', 
    priceEUR: null, 
    platformFeeEUR: 1000, 
    priceNote: 'od €45–65 / uživ. + €1 000 platforma', 
    minSeats: 100,
    description: 'Velké firmy, compliance'
  },
} as const;

// Channel addon prices (configurable currency)
const channelAddonUSD = { 
  web: 5, 
  whatsapp: 10, 
  phone: 20 
} as const;

type ChannelKey = keyof typeof channelAddonUSD;

// Usage limits for each plan
type Limits = { 
  webrtcMin: number | string; 
  pstnMin: number | string; 
  whatsappMsgs: number | string; 
  ttsChars: number | string; 
  sttMin: number | string;
};

const limits: Record<keyof typeof plans, Limits> = {
  free: { 
    webrtcMin: 20, 
    pstnMin: 5, 
    whatsappMsgs: 25, 
    ttsChars: '10 000', 
    sttMin: 15 
  },
  starter: { 
    webrtcMin: 50, 
    pstnMin: 20, 
    whatsappMsgs: 100, 
    ttsChars: '30 000', 
    sttMin: 60 
  },
  pro: { 
    webrtcMin: 200, 
    pstnMin: 80, 
    whatsappMsgs: 400, 
    ttsChars: '75 000', 
    sttMin: 240 
  },
  enterprise: { 
    webrtcMin: '500+', 
    pstnMin: '200+', 
    whatsappMsgs: '1 000+', 
    ttsChars: '200 000+', 
    sttMin: '600+' 
  },
};

// Key features for each plan
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

// Channel information
const channelInfo = {
  web: {
    label: 'Web/App hovory (WebRTC)',
    icon: Monitor,
    description: 'Přímé hovory přes webový prohlížeč'
  },
  whatsapp: {
    label: 'WhatsApp hovory/zprávy',
    icon: MessageSquare,
    description: 'Integrace s WhatsApp Business API'
  },
  phone: {
    label: 'Telefonní hovory (PSTN)',
    icon: Phone,
    description: 'Klasické telefonní hovory'
  }
};

export const Pricing: React.FC = () => {
  const [selectedChannels, setSelectedChannels] = useState<Record<keyof typeof plans, ChannelKey>>({
    free: 'web',
    starter: 'web',
    pro: 'web',
    enterprise: 'web'
  });
  
  const [expandedPlans, setExpandedPlans] = useState<Set<keyof typeof plans>>(new Set());

  const handleChannelChange = (planKey: keyof typeof plans, channel: ChannelKey) => {
    setSelectedChannels(prev => ({
      ...prev,
      [planKey]: channel
    }));
  };

  const togglePlanDetails = (planKey: keyof typeof plans) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planKey)) {
        newSet.delete(planKey);
      } else {
        newSet.add(planKey);
      }
      return newSet;
    });
  };

  const handleContactSales = () => {
    window.location.href = 'mailto:sales@ailektor.cz?subject=Enterprise%20Plan%20Inquiry';
  };

  return (
    <section className="section bg-muted">
      <div className="container">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="heading heading-2 mb-4"
          >
            Subscription plány
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-large text-muted mb-2"
          >
            Vyberte si plán podle velikosti vašeho týmu
          </motion.p>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-small text-muted"
          >
            Ceny jsou orientační, bez DPH. Fakturace měsíčně.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(Object.keys(plans) as Array<keyof typeof plans>).map((planKey, index) => {
            const plan = plans[planKey];
            const planLimits = limits[planKey];
            const planFeatures = features[planKey];
            const selectedChannel = selectedChannels[planKey];
            const isExpanded = expandedPlans.has(planKey);
            const ChannelIcon = channelInfo[selectedChannel].icon;

            return (
              <motion.div
                key={planKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`card relative ${plan.recommended ? 'ring-2 ring-accent shadow-xl scale-105' : ''}`}
              >
                {/* Recommended Badge */}
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-accent text-white px-4 py-1 rounded-full text-small font-medium flex items-center gap-1">
                      <Star size={14} />
                      Doporučeno
                    </div>
                  </div>
                )}

                <div className="card-body">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <h3 className="heading heading-4 mb-2">{plan.label}</h3>
                    <p className="text-small text-muted mb-4">{plan.description}</p>
                    
                    {/* Price Display */}
                    <div className="mb-4">
                      {plan.priceEUR !== null ? (
                        <div>
                          <div className="text-3xl font-bold heading">
                            od €{plan.priceEUR}
                          </div>
                          <div className="text-small text-muted">
                            + kanál od ${channelAddonUSD[selectedChannel]} / měsíc
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl font-bold heading text-center">
                            {plan.priceNote}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted mt-1">
                        min. {plan.minSeats} uživatel{plan.minSeats > 1 ? 'ů' : ''}
                      </div>
                    </div>

                    {/* Channel Selection */}
                    <div className="mb-4">
                      <label className="block text-small font-medium mb-2">Kanál komunikace:</label>
                      <div className="space-y-2">
                        {(Object.keys(channelInfo) as ChannelKey[]).map((channel) => {
                          const info = channelInfo[channel];
                          const Icon = info.icon;
                          return (
                            <label
                              key={channel}
                              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <input
                                type="radio"
                                name={`channel-${planKey}`}
                                value={channel}
                                checked={selectedChannel === channel}
                                onChange={() => handleChannelChange(planKey, channel)}
                                className="text-accent focus:ring-accent"
                              />
                              <Icon size={16} className="text-gray-600" />
                              <div className="flex-1 text-left">
                                <div className="text-small font-medium">{info.label}</div>
                                <div className="text-xs text-muted">od ${channelAddonUSD[channel]}/měs.</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mb-4">
                    {planKey === 'enterprise' ? (
                      <button
                        onClick={handleContactSales}
                        className="w-full btn btn-primary focus-ring"
                      >
                        <Building2 size={18} />
                        Kontaktovat obchod
                      </button>
                    ) : (
                      <button
                        className="w-full btn btn-primary focus-ring"
                        onClick={() => window.location.href = '/register'}
                      >
                        Začít s {plan.label}
                      </button>
                    )}
                  </div>

                  {/* Expand Details Button */}
                  <button
                    onClick={() => togglePlanDetails(planKey)}
                    className="w-full btn btn-ghost text-small focus-ring"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={16} />
                        Skrýt detaily
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Zobrazit detaily
                      </>
                    )}
                  </button>

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 border-t border-gray-200 pt-4 overflow-hidden"
                      >
                        {/* Usage Limits */}
                        <div className="mb-4">
                          <h4 className="font-medium mb-2 text-small">Zahrnuté limity (na uživatele/měsíc):</h4>
                          <ul className="space-y-1 text-xs text-muted">
                            <li>WebRTC: {planLimits.webrtcMin} min</li>
                            <li>PSTN: {planLimits.pstnMin} min</li>
                            <li>WhatsApp: {planLimits.whatsappMsgs} zpráv</li>
                            <li>TTS: {planLimits.ttsChars} znaků</li>
                            <li>STT: {planLimits.sttMin} min</li>
                          </ul>
                        </div>

                        {/* Key Features */}
                        <div>
                          <h4 className="font-medium mb-2 text-small">Klíčové funkce:</h4>
                          <ul className="space-y-1">
                            {planFeatures.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs">
                                <Check size={12} className="text-accent mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="card card-body bg-gray-100 max-w-2xl mx-auto">
            <h3 className="heading heading-5 mb-3">Kanálové příplatky</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-small">
              {(Object.keys(channelInfo) as ChannelKey[]).map((channel) => {
                const info = channelInfo[channel];
                const Icon = info.icon;
                return (
                  <div key={channel} className="flex items-center gap-2">
                    <Icon size={16} className="text-accent" />
                    <div>
                      <div className="font-medium">{info.label}</div>
                      <div className="text-muted">od ${channelAddonUSD[channel]}/měs.</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-4">
              * Ceny kanálů jsou orientační a mohou se lišit podle skutečného využití
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}; 