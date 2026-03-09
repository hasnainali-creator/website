import React, { useState } from 'react';

const ContactForm = () => {
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        purpose: 'general',
        message: '',
        honeypot: '', // Anti-spam hidden field
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.honeypot) return; // Silent drop for bots

        setStatus('sending');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', purpose: 'general', message: '', honeypot: '' });
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-8 rounded-lg text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">Message Delivered!</h3>
                <p className="text-green-700 dark:text-green-300">Thank you for reaching out. Our team will review your message and get back to you within 24-48 hours.</p>
                <button
                    onClick={() => setStatus('idle')}
                    className="mt-6 text-sm font-medium text-green-700 dark:text-green-300 hover:underline"
                >
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot - Hidden from humans */}
            <div className="hidden" aria-hidden="true">
                <input
                    type="text"
                    name="honeypot"
                    value={formData.honeypot}
                    onChange={handleChange}
                    tabIndex={-1}
                    autoComplete="off"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="John Doe"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Business Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="john@company.com"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="purpose" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Purpose of Inquiry</label>
                <select
                    id="purpose"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                >
                    <option value="general">General Message</option>
                    <option value="news">🗞️ News Tip / Story Lead</option>
                    <option value="ads">📈 Advertising & Partnerships</option>
                    <option value="careers">✍️ Join the Writing Team</option>
                    <option value="correction">⚠️ Report a Fact Error</option>
                    <option value="tech">🛠️ Technical Support</option>
                </select>
            </div>

            <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message Content</label>
                <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="How can we help you today?"
                ></textarea>
            </div>

            <div className="flex items-center space-x-2">
                <input type="checkbox" id="terms" required className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="terms" className="text-xs text-gray-500 dark:text-gray-400">
                    I understand that OmnySports handles my data according to the Privacy Policy.
                </label>
            </div>

            {status === 'error' && (
                <p className="text-red-500 text-sm animate-shake">Something went wrong. Please try again or contact us directly.</p>
            )}

            <button
                type="submit"
                disabled={status === 'sending'}
                className={`w-full py-4 px-6 rounded-md font-bold text-white transition-all transform active:scale-[0.98] ${status === 'sending' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                    }`}
            >
                {status === 'sending' ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </span>
                ) : 'Submit Secure Inquiry'}
            </button>

            <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest uppercase">
                Protected by global encryption standards & anti-spam logic
            </p>
        </form>
    );
};

export default ContactForm;
