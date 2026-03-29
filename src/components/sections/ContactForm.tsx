import React, { useState, useMemo, useRef, useCallback } from 'react';

type PurposeType = 'editorial' | 'tip' | 'copyright' | 'accessibility' | 'privacy' | 'ads' | 'careers' | 'tech' | 'other';

interface FormData {
    name: string;
    email: string;
    purpose: PurposeType;
    subject: string;
    message: string;
    honeypot: string;
}

interface FieldErrors {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
}

interface TouchedFields {
    name: boolean;
    email: boolean;
    subject: boolean;
    message: boolean;
}

const CATEGORY_GUIDANCE: Record<string, string> = {
    editorial: "We investigate all reports of factual errors within 24 hours. Please include the article link and the specific correction needed.",
    tip: "Your confidentiality is our priority. Professional story leads are routed directly to our investigative desk.",
    copyright: "Formal legal inquiries regarding intellectual property are processed under our standard legal procedure.",
    accessibility: "We are committed to inclusivity. Please describe the digital barrier you encountered so we can address it immediately.",
};

const FIELD_HINTS: Record<string, string> = {
    name: "Enter your full legal name or the name you'd like our team to use when responding.",
    email: "Use a valid, active email address. Our response will be sent directly to this inbox.",
    subject: "Provide a clear, concise subject so our team can route your inquiry accurately.",
    message: "The more detail you provide, the faster and more accurately we can address your inquiry. Include links, dates, or any relevant context.",
};

const MIN_LENGTHS = { name: 3, subject: 10, message: 50 };
const MESSAGE_MAX = 2000;

// Validate a single field value
function validateField(field: keyof FieldErrors, value: string): string | undefined {
    switch (field) {
        case 'name':
            if (!value.trim()) return 'Full name is required.';
            if (value.trim().length < MIN_LENGTHS.name) return `Name must be at least ${MIN_LENGTHS.name} characters.`;
            if (!/^[a-zA-Z\s'\-\.]+$/.test(value.trim())) return 'Name must contain only letters, spaces, or hyphens.';
            return undefined;
        case 'email':
            if (!value.trim()) return 'Email address is required.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return 'Please enter a valid email address (e.g. name@domain.com).';
            return undefined;
        case 'subject':
            if (!value.trim()) return 'Subject is required.';
            if (value.trim().length < MIN_LENGTHS.subject) return `Subject must be at least ${MIN_LENGTHS.subject} characters.`;
            return undefined;
        case 'message':
            if (!value.trim()) return 'A detailed message is required.';
            if (value.trim().length < MIN_LENGTHS.message) return `Message is too brief — please provide at least ${MIN_LENGTHS.message} characters (${value.trim().length}/${MIN_LENGTHS.message}).`;
            if (value.length > MESSAGE_MAX) return `Message exceeds the ${MESSAGE_MAX} character limit.`;
            return undefined;
        default:
            return undefined;
    }
}

// Info tooltip component
const InfoTooltip = ({ text }: { text: string }) => {
    const [visible, setVisible] = useState(false);
    return (
        <span className="relative inline-flex items-center ml-1.5">
            <button
                type="button"
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onFocus={() => setVisible(true)}
                onBlur={() => setVisible(false)}
                aria-label="Field guidance"
                className="w-[18px] h-[18px] rounded-full border border-zinc-300 text-zinc-400 text-[10px] font-black flex items-center justify-center hover:border-blue-400 hover:text-blue-500 transition-all focus:outline-none focus:border-blue-500 leading-none select-none"
            >
                i
            </button>
            {visible && (
                <span
                    role="tooltip"
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-64 z-50 bg-zinc-900 text-zinc-100 text-xs font-medium leading-relaxed rounded-xl px-4 py-3 shadow-2xl pointer-events-none"
                    style={{ animation: 'fadeInScale 0.15s ease-out' }}
                >
                    {text}
                    <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-900 rotate-45" />
                </span>
            )}
        </span>
    );
};

// Error message component with animation
const FieldError = ({ message }: { message: string }) => (
    <div
        className="flex items-center gap-2 mt-2"
        style={{ animation: 'slideInError 0.2s ease-out' }}
        role="alert"
        aria-live="polite"
    >
        <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-[11px] font-bold text-red-500 uppercase tracking-wide leading-none">{message}</span>
    </div>
);

// Valid checkmark
const ValidMark = () => (
    <div className="flex items-center gap-2 mt-2" style={{ animation: 'slideInError 0.2s ease-out' }}>
        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wide leading-none">Looks good</span>
    </div>
);

// Custom styled dropdown
const PURPOSE_OPTIONS = [
    { value: 'editorial',     label: 'Factual Correction / Editorial Feedback' },
    { value: 'tip',           label: 'Confidential News Tip / Story Lead' },
    { value: 'copyright',     label: 'Copyright / DMCA Claim' },
    { value: 'accessibility', label: 'Accessibility Issue / Barrier Report' },
    { value: 'privacy',       label: 'Data Privacy Request (GDPR/CCPA)' },
    { value: 'ads',           label: 'Advertising & Partnerships' },
    { value: 'careers',       label: 'Join the Editorial Team' },
    { value: 'tech',          label: 'Technical Site Issue' },
    { value: 'other',         label: 'Other / General Inquiry' },
];

const CustomSelect = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (val: PurposeType) => void;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = PURPOSE_OPTIONS.find(o => o.value === value);

    // Close on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="w-full flex items-center justify-between px-0 py-4 bg-transparent border-b-2 border-zinc-100 hover:border-blue-400 focus:border-blue-500 outline-none transition-all duration-300 text-lg font-medium text-zinc-900 text-left cursor-pointer group"
            >
                <span>{selected?.label}</span>
                <svg
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-zinc-100 rounded-2xl shadow-2xl overflow-hidden py-2"
                    style={{ animation: 'slideInError 0.15s ease-out' }}
                >
                    {PURPOSE_OPTIONS.map(opt => (
                        <li
                            key={opt.value}
                            role="option"
                            aria-selected={opt.value === value}
                            onClick={() => { onChange(opt.value as PurposeType); setOpen(false); }}
                            className={`px-5 py-3 text-sm font-medium cursor-pointer transition-colors duration-150 ${
                                opt.value === value
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                            }`}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const ContactForm = () => {
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState<FormData>({
        name: '', email: '', purpose: 'other', subject: '', message: '', honeypot: '',
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<TouchedFields>({
        name: false, email: false, subject: false, message: false,
    });
    const [shakeField, setShakeField] = useState<string | null>(null);

    // Refs for scroll-to-error
    const fieldRefs = {
        name: useRef<HTMLDivElement>(null),
        email: useRef<HTMLDivElement>(null),
        subject: useRef<HTMLDivElement>(null),
        message: useRef<HTMLDivElement>(null),
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const name = e.target.name as keyof FormData;
        const value = e.target.value;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Live re-validate if already touched
        if (touched[name as keyof TouchedFields]) {
            const field = name as keyof FieldErrors;
            // Only validate if it's a field we care about for error reporting
            if (['name', 'email', 'subject', 'message'].includes(field)) {
                const err = validateField(field, value);
                setErrors(prev => ({ ...prev, [field]: err }));
            }
        }
    };

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const name = e.target.name as keyof FormData;
        const value = e.target.value;
        setTouched(prev => ({ ...prev, [name]: true }));
        
        const field = name as keyof FieldErrors;
        if (['name', 'email', 'subject', 'message'].includes(field)) {
            const err = validateField(field, value);
            setErrors(prev => ({ ...prev, [field]: err }));
            if (err) {
                setShakeField(field);
                setTimeout(() => setShakeField(null), 500);
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.honeypot) return;

        // Validate ALL fields on submit
        const allFields: (keyof FieldErrors)[] = ['name', 'email', 'subject', 'message'];
        const newErrors: FieldErrors = {};
        let firstErrorField: keyof FieldErrors | null = null;

        allFields.forEach(field => {
            const err = validateField(field, formData[field]);
            if (err) {
                newErrors[field] = err;
                if (!firstErrorField) firstErrorField = field;
            }
        });

        // Mark all as touched
        setTouched({ name: true, email: true, subject: true, message: true });
        setErrors(newErrors);

        // If errors — scroll to first error and shake it
        if (firstErrorField) {
            const ref = fieldRefs[firstErrorField as keyof typeof fieldRefs];
            const currentEl = ref.current;
            if (currentEl) {
                currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const inputEl = currentEl.querySelector('input, textarea') as HTMLElement | null;
                if (inputEl) inputEl.focus();
            }
            setShakeField(firstErrorField);
            setTimeout(() => setShakeField(null), 500);
            return;
        }

        setStatus('sending');
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', purpose: 'other', subject: '', message: '', honeypot: '' });
                setErrors({});
                setTouched({ name: false, email: false, subject: false, message: false });
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    const subjectLabel = useMemo(() => formData.purpose === 'other' ? 'Topic Summary' : 'Subject', [formData.purpose]);
    const guidanceText = useMemo(() => CATEGORY_GUIDANCE[formData.purpose] || null, [formData.purpose]);

    // Border color helper
    const borderClass = (field: keyof FieldErrors) => {
        if (!touched[field]) return 'border-zinc-100';
        if (errors[field]) return 'border-red-400';
        return 'border-emerald-400';
    };

    const msgLen = formData.message.length;
    const msgProgress = Math.min((msgLen / MIN_LENGTHS.message) * 100, 100);
    const msgOverLimit = msgLen > MESSAGE_MAX;

    if (status === 'success') {
        return (
            <div className="bg-white border border-gray-100 p-16 rounded-3xl text-center shadow-xl" style={{ animation: 'fadeInScale 0.4s ease-out' }}>
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Inquiry Received</h3>
                <p className="text-gray-500 max-w-sm mx-auto leading-relaxed text-lg">
                    Thank you for contacting OmnySports. A member of our editorial or support team will review your message and respond within 24 business hours.
                </p>
                <button
                    onClick={() => setStatus('idle')}
                    className="mt-10 px-8 py-3 bg-zinc-900 text-white rounded-full text-sm font-bold uppercase tracking-widest hover:scale-105 transition-all"
                >
                    Submit another inquiry
                </button>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes slideInError {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.97); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes shakeField {
                    0%,100% { transform: translateX(0); }
                    15%     { transform: translateX(-6px); }
                    30%     { transform: translateX(6px); }
                    45%     { transform: translateX(-4px); }
                    60%     { transform: translateX(4px); }
                    75%     { transform: translateX(-2px); }
                    90%     { transform: translateX(2px); }
                }
                .shake-anim { animation: shakeField 0.45s ease-out; }
            `}</style>

            <div className="max-w-4xl mx-auto space-y-12">
                {/* Guidance Banner */}
                {guidanceText && (
                    <div className="bg-blue-50/50 border-l-4 border-blue-500 p-6 rounded-r-2xl" style={{ animation: 'slideInError 0.3s ease-out' }}>
                        <div className="flex gap-4">
                            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-blue-800 leading-relaxed font-semibold">{guidanceText}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-12" noValidate>
                    {/* Honeypot */}
                    <div className="hidden" aria-hidden="true">
                        <input type="text" name="honeypot" value={formData.honeypot} onChange={handleChange} tabIndex={-1} autoComplete="off" />
                    </div>

                    {/* Name + Email Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Full Name */}
                        <div ref={fieldRefs.name} className={`space-y-1 ${shakeField === 'name' ? 'shake-anim' : ''}`}>
                            <div className="flex items-center">
                                <label htmlFor="name" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    Full Name
                                </label>
                                <InfoTooltip text={FIELD_HINTS.name} />
                            </div>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                aria-describedby={errors.name ? 'name-error' : undefined}
                                aria-invalid={touched.name && !!errors.name}
                                className={`w-full px-0 py-4 bg-transparent border-b-2 ${borderClass('name')} focus:border-blue-500 outline-none transition-all duration-300 font-medium text-lg text-zinc-900 placeholder:text-zinc-200`}
                                placeholder="John Doe"
                            />
                            {touched.name && errors.name && <FieldError message={errors.name} />}
                            {touched.name && !errors.name && formData.name && <ValidMark />}
                        </div>

                        {/* Email */}
                        <div ref={fieldRefs.email} className={`space-y-1 ${shakeField === 'email' ? 'shake-anim' : ''}`}>
                            <div className="flex items-center">
                                <label htmlFor="email" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    Email Address
                                </label>
                                <InfoTooltip text={FIELD_HINTS.email} />
                            </div>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                                aria-invalid={touched.email && !!errors.email}
                                className={`w-full px-0 py-4 bg-transparent border-b-2 ${borderClass('email')} focus:border-blue-500 outline-none transition-all duration-300 font-medium text-lg text-zinc-900 placeholder:text-zinc-200`}
                                placeholder="name@email.com"
                            />
                            {touched.email && errors.email && <FieldError message={errors.email} />}
                            {touched.email && !errors.email && formData.email && <ValidMark />}
                        </div>
                    </div>

                    {/* Nature of Inquiry */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Nature of Inquiry</label>
                        <CustomSelect
                            value={formData.purpose}
                            onChange={(val) => setFormData(prev => ({ ...prev, purpose: val }))}
                        />
                    </div>

                    {/* Subject */}
                    <div ref={fieldRefs.subject} className={`space-y-1 ${shakeField === 'subject' ? 'shake-anim' : ''}`}>
                        <div className="flex items-center">
                            <label htmlFor="subject" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                {subjectLabel}
                            </label>
                            <InfoTooltip text={FIELD_HINTS.subject} />
                        </div>
                        <input
                            type="text"
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-describedby={errors.subject ? 'subject-error' : undefined}
                            aria-invalid={touched.subject && !!errors.subject}
                            className={`w-full px-0 py-4 bg-transparent border-b-2 ${borderClass('subject')} focus:border-blue-500 outline-none transition-all duration-300 font-medium text-lg text-zinc-900 placeholder:text-zinc-200`}
                            placeholder={formData.purpose === 'other' ? 'Briefly specify your topic (min. 10 chars)' : 'Inquiry subject line (min. 10 chars)'}
                        />
                        {touched.subject && errors.subject && <FieldError message={errors.subject} />}
                        {touched.subject && !errors.subject && formData.subject && <ValidMark />}
                    </div>

                    {/* Message */}
                    <div ref={fieldRefs.message} className={`space-y-1 ${shakeField === 'message' ? 'shake-anim' : ''}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <label htmlFor="message" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    Detailed Description
                                </label>
                                <InfoTooltip text={FIELD_HINTS.message} />
                            </div>
                            {/* Character counter */}
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                msgOverLimit ? 'text-red-500' :
                                msgLen >= MIN_LENGTHS.message ? 'text-emerald-500' :
                                msgLen > 0 ? 'text-amber-500' : 'text-zinc-300'
                            }`}>
                                {msgLen} / {MESSAGE_MAX}
                            </span>
                        </div>

                        <textarea
                            id="message"
                            name="message"
                            rows={7}
                            value={formData.message}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-describedby={errors.message ? 'message-error' : undefined}
                            aria-invalid={touched.message && !!errors.message}
                            className={`w-full px-0 py-4 bg-transparent border-b-2 ${borderClass('message')} focus:border-blue-500 outline-none transition-all duration-300 resize-none font-medium text-lg text-zinc-900 placeholder:text-zinc-200`}
                            placeholder={`Please provide as much relevant detail as possible (minimum ${MIN_LENGTHS.message} characters)...`}
                        />

                        {/* Progress bar toward minimum */}
                        {msgLen > 0 && msgLen < MIN_LENGTHS.message && (
                            <div className="mt-1 h-0.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${msgProgress}%` }}
                                />
                            </div>
                        )}

                        {touched.message && errors.message && <FieldError message={errors.message} />}
                        {touched.message && !errors.message && formData.message && <ValidMark />}
                    </div>

                    {/* Footer: SLA + Submit */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-8 border-t border-zinc-100">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">Response SLA</p>
                            <p className="text-sm font-medium text-zinc-500">Guaranteed review within 24 business hours.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="bg-zinc-900 text-white font-black text-sm uppercase tracking-widest py-5 px-12 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:bg-zinc-300 disabled:cursor-not-allowed min-w-[240px]"
                        >
                            {status === 'sending' ? (
                                <span className="flex items-center justify-center gap-3">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Dispatching...
                                </span>
                            ) : 'Submit Inquiry'}
                        </button>
                    </div>

                    {/* Network Error */}
                    {status === 'error' && (
                        <div className="flex items-center gap-3 text-red-500 font-bold text-sm uppercase tracking-tight" style={{ animation: 'slideInError 0.2s ease-out' }} role="alert">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Transmission error. Please check your connection and try again.</span>
                        </div>
                    )}

                    {/* Institutional Links */}
                    <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-12 border-t border-zinc-100">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Institutional Channels</h4>
                            <div className="flex gap-8">
                                <a href="https://x.com/omnysports" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-sm font-bold text-zinc-900 hover:text-blue-500 transition-colors">
                                    <span className="pb-1 border-b border-zinc-200 group-hover:border-blue-500/50 transition-colors">Twitter / X</span>
                                </a>
                                <a href="https://linkedin.com/company/omnysports" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-sm font-bold text-zinc-900 hover:text-blue-500 transition-colors">
                                    <span className="pb-1 border-b border-zinc-200 group-hover:border-blue-500/50 transition-colors">LinkedIn</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
};

export default ContactForm;
