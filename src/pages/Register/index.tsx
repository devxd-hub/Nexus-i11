import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  teamName: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(60, 'Team name must be at most 60 characters')
    .trim(),
  leaderName: z.string().min(1, 'Leader name is required').trim(),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  college: z.string().min(1, 'College and year information is required').trim(),
  track: z.string().trim().max(100).optional(),
  members: z.string().optional(),
  consent: z.literal(true, {
    message: 'You must agree to the terms and conditions',
  }),
  website: z.string().optional(), // Honeypot
});

type FormData = z.infer<typeof formSchema>;

export default function Register() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'conflict' | 'rate-limit'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const initialEmail = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('email') || ''
    : '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: '',
      leaderName: '',
      email: initialEmail,
      phone: '',
      college: '',
      track: '',
      members: '',
      website: '',
    },
  });

  const handleReturnHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const onSubmit = async (data: FormData) => {
    if (data.website) {
      // Honeypot filled out, silently abort
      return;
    }

    setSubmitStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.status === 201) {
        setSubmitStatus('success');
        reset();
      } else if (response.status === 400) {
        setSubmitStatus('error');
        const resData = await response.json().catch(() => ({}));
        setErrorMessage(resData.message || 'Please check your inputs and try again.');
      } else if (response.status === 409) {
        setSubmitStatus('conflict');
        setErrorMessage('Email or Team Name is already registered.');
      } else if (response.status === 429) {
        setSubmitStatus('rate-limit');
        setErrorMessage('Too many registration attempts. Please try again later.');
      } else {
        throw new Error('Unexpected error');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Something went wrong. Please try again or contact support.');
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-[#0f1115] border border-[#1f242d] rounded-sm p-8 max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ffd7d2] to-[#ffe4de]"></div>
          <CheckCircle2 className="w-16 h-16 text-[#f59e0b] mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-mono mb-2 text-white uppercase tracking-wider">
            Registration Complete
          </h2>
          <p className="text-[#64748b] mb-8">
            Your telemetry has been securely transmitted. Awaiting further instruction.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setSubmitStatus('idle')}
              className="w-full sm:w-auto bg-gradient-to-r from-[#ffd7d2] to-[#ffe4de] text-[#0f1115] px-8 py-3 font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity border border-transparent hover:border-[#f59e0b]"
            >
              Acknowledge
            </button>
            <a
              href="/"
              onClick={handleReturnHome}
              className="w-full sm:w-auto bg-[#13171d] text-[#ededed] px-8 py-3 font-mono text-sm uppercase tracking-widest hover:text-white border border-[#272f3d] hover:border-[#f59e0b] transition-all text-center"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const inputClasses = "w-full p-3 bg-[#13171d] border border-[#272f3d] text-white placeholder-[#475569] focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] focus:outline-none transition-colors font-mono text-sm";
  const labelClasses = "block font-mono text-xs text-[#64748b] uppercase tracking-wider mb-2";

  return (
    <div
      className="min-h-screen text-white py-12 px-4 sm:px-6 lg:px-8 font-sans"
      style={{
        backgroundImage: "linear-gradient(rgba(7,8,10,0.78), rgba(7,8,10,0.86)), url('/gta6/hero-water-no-ships.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Navigation Return Link */}
        <div className="mb-6">
          <a
            href="/"
            onClick={handleReturnHome}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#f59e0b] hover:text-white uppercase tracking-wider transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Hack for Good</span>
          </a>
        </div>

        <div className="text-center mb-10">
          <span className="text-[#f59e0b] font-mono text-sm uppercase tracking-widest block mb-3">
            SECTOR 02 · REGISTRATION
          </span>
          <h1 className="text-4xl md:text-5xl font-mono text-white mb-4 tracking-widest uppercase">
            Initialize Team
          </h1>
          <p className="text-[#64748b] max-w-lg mx-auto">
            Input squad telemetry below. Ensure accurate contact protocols for confirmation.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[#0f1115] border border-[#1f242d] p-6 md:p-10 relative overflow-hidden"
          noValidate
        >
          {/* Tech decorative elements */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#64748b]"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#64748b]"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#64748b]"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#64748b]"></div>
          
          {submitStatus !== 'idle' && submitStatus !== 'loading' && (
            <div
              className={`p-4 mb-8 border flex items-start gap-3 bg-[#13171d] ${
                submitStatus === 'conflict' || submitStatus === 'error' || submitStatus === 'rate-limit'
                  ? 'border-[#ef4444] text-[#ef4444]'
                  : 'border-[#f59e0b] text-[#f59e0b]'
              }`}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-mono text-sm uppercase tracking-wider">Initialization Failed</h3>
                <p className="text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Honeypot field */}
          <div aria-hidden="true" style={{ display: 'none' }}>
            <label htmlFor="website">Website</label>
            <input type="text" id="website" {...register('website')} tabIndex={-1} autoComplete="off" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="teamName" className={labelClasses}>
                  Squad Designation *
                </label>
                <input
                  id="teamName"
                  type="text"
                  placeholder="e.g. Protocol Alpha"
                  className={`${inputClasses} ${errors.teamName ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''}`}
                  {...register('teamName')}
                  aria-invalid={errors.teamName ? 'true' : 'false'}
                />
                {errors.teamName && (
                  <p className="text-[#ef4444] text-xs flex items-center gap-1 mt-2 font-mono">
                    <AlertCircle className="w-3 h-3" /> {errors.teamName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="leaderName" className={labelClasses}>
                  Lead Operator *
                </label>
                <input
                  id="leaderName"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  className={`${inputClasses} ${errors.leaderName ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''}`}
                  {...register('leaderName')}
                  aria-invalid={errors.leaderName ? 'true' : 'false'}
                />
                {errors.leaderName && (
                  <p className="text-[#ef4444] text-xs flex items-center gap-1 mt-2 font-mono">
                    <AlertCircle className="w-3 h-3" /> {errors.leaderName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className={labelClasses}>
                  Secure Comms (Email) *
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="jane@network.gov"
                  className={`${inputClasses} ${errors.email ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''}`}
                  {...register('email')}
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
                {errors.email && (
                  <p className="text-[#ef4444] text-xs flex items-center gap-1 mt-2 font-mono">
                    <AlertCircle className="w-3 h-3" /> {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className={labelClasses}>
                  Direct Uplink (Phone) *
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="1234567890"
                  className={`${inputClasses} ${errors.phone ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''}`}
                  {...register('phone')}
                  aria-invalid={errors.phone ? 'true' : 'false'}
                />
                {errors.phone && (
                  <p className="text-[#ef4444] text-xs flex items-center gap-1 mt-2 font-mono">
                    <AlertCircle className="w-3 h-3" /> {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="college" className={labelClasses}>
                Origin Node (College & Year) *
              </label>
              <input
                id="college"
                type="text"
                placeholder="e.g. State Univ, Year 3"
                className={`${inputClasses} ${errors.college ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''}`}
                {...register('college')}
                aria-invalid={errors.college ? 'true' : 'false'}
              />
              {errors.college && (
                <p className="text-[#ef4444] text-xs flex items-center gap-1 mt-2 font-mono">
                  <AlertCircle className="w-3 h-3" /> {errors.college.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="track" className={labelClasses}>
                Mission Vector (Optional)
              </label>
              <select
                id="track"
                className={inputClasses}
                {...register('track')}
              >
                <option value="">Select a track...</option>
                <option value="AI & DATA">01. AI & DATA</option>
                <option value="WEB & APP">02. WEB & APP</option>
                <option value="SUSTAINABILITY">03. SUSTAINABILITY</option>
                <option value="SOCIAL IMPACT">04. SOCIAL IMPACT</option>
                <option value="OPEN INNOVATION">05. OPEN INNOVATION</option>
                <option value="Education & Skills">Education & Skills</option>
                <option value="Health & Wellbeing">Health & Wellbeing</option>
                <option value="Climate & Nature">Climate & Nature</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="members" className={labelClasses}>
                Auxiliary Personnel (Optional)
              </label>
              <textarea
                id="members"
                rows={3}
                placeholder="List additional operatives..."
                className={`${inputClasses} resize-y`}
                {...register('members')}
              ></textarea>
            </div>

            <div>
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    {...register('consent')}
                  />
                  <div className={`w-5 h-5 border transition-colors flex items-center justify-center bg-[#13171d] ${
                    errors.consent ? 'border-[#ef4444]' : 'border-[#475569] group-hover:border-[#f59e0b]'
                  } peer-checked:border-[#f59e0b]`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#f59e0b] opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <span className="text-sm text-[#64748b] leading-relaxed">
                  I acknowledge the Hack for Good operational parameters, Code of Conduct, and confirm eligibility for all squad members. *
                </span>
              </label>
              {errors.consent && (
                <p className="text-[#ef4444] text-xs flex items-center gap-1 mt-2 font-mono">
                  <AlertCircle className="w-3 h-3" /> {errors.consent.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitStatus === 'loading'}
              className="w-full bg-gradient-to-r from-[#ffd7d2] to-[#ffe4de] text-[#0f1115] py-4 font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center justify-center gap-3 mt-8 disabled:opacity-70 disabled:cursor-not-allowed border-2 border-transparent hover:border-[#f59e0b]"
            >
              {submitStatus === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#0f1115]" />
                  Transmitting...
                </>
              ) : (
                <>
                  Initialize
                  <ArrowRight className="w-5 h-5 text-[#0f1115]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
