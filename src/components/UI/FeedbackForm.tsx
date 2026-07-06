import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Film, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDroneStore } from '../../store/useDroneStore';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackForm({ isOpen, onClose }: FeedbackFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [feedbackType, setFeedbackType] = useState('bug');
  const [message, setMessage] = useState('');
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  
  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addNotification = useDroneStore((state) => state.addNotification);

  // Clean up object URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  if (!isOpen) return null;

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm']; // quicktime is mov
  const maxFileSize = 25 * 1024 * 1024; // 25MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize) {
      setErrorMsg('File exceeds 25MB limit. Please upload a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file type
    const isImage = allowedImageTypes.includes(file.type) || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    const isVideo = allowedVideoTypes.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name);

    if (!isImage && !isVideo) {
      setErrorMsg('Unsupported file type. Accepted formats: JPG, JPEG, PNG, WEBP, MP4, MOV, WEBM.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setFileType(isImage ? 'image' : 'video');
    
    // Revoke previous preview if exists
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileType(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Basic Validation
    if (!email) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!message || message.trim().length < 10) {
      setErrorMsg('Please enter a message (minimum 10 characters).');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    // Simulate upload progress & Google Form / backend integration mock
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Finalize submission
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccess(true);
          addNotification('Feedback submitted successfully!', 'success');
          
          // Reset form after a brief delay
          setTimeout(() => {
            handleReset();
            onClose();
          }, 2000);
        }, 300);
      }
      setUploadProgress(progress);
    }, 150);
  };

  const handleReset = () => {
    setEmail('');
    setName('');
    setFeedbackType('bug');
    setMessage('');
    handleRemoveFile();
    setSuccess(false);
    setErrorMsg('');
    setUploadProgress(0);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 overflow-hidden pointer-events-auto max-h-[92vh] flex flex-col z-[201] text-white">
        {/* Close Button */}
        {!isSubmitting && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center my-auto space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide uppercase">Thank You!</h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Your feedback has been logged. We appreciate your help in improving the PlutoX Flight Simulator!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="border-b border-slate-800 pb-3 mb-4 shrink-0">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Submit Flight Feedback</h2>
              <p className="text-xs text-slate-400 mt-1">Report bugs, request features, or share your training insights.</p>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilot Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter your name (optional)"
                  className="w-full bg-slate-950/65 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Email (Required) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  placeholder="your.email@address.com"
                  className="w-full bg-slate-950/65 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Feedback Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedback Type</label>
                <select 
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950/65 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition"
                >
                  <option value="bug">Bug / Simulation Issue</option>
                  <option value="feature">Feature Request</option>
                  <option value="physics">Flight Controls & Physics</option>
                  <option value="other">General Feedback</option>
                </select>
              </div>

              {/* Message (Required) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Detailed Report <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSubmitting}
                  required
                  rows={4}
                  placeholder="Describe the issue, behavior, or suggestion in detail..."
                  className="w-full bg-slate-950/65 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition resize-none"
                />
              </div>

              {/* File Attachment Upload Zone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Media Attachment (Optional)
                </label>
                
                {!selectedFile ? (
                  <div 
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className={`border border-dashed border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 hover:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${isSubmitting ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="w-6 h-6 text-slate-500" />
                    <span className="text-xs text-slate-400 text-center font-medium">Click to upload screenshot or flight video</span>
                    <span className="text-[9px] text-slate-500 tracking-wide">JPG, PNG, WEBP, MP4, MOV, WEBM (Max 25MB)</span>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-slate-800 bg-slate-950/40 p-3 flex gap-3 items-center">
                    {/* Media Preview Card */}
                    <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {fileType === 'image' && filePreview && (
                        <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      )}
                      {fileType === 'video' && filePreview && (
                        <div className="relative w-full h-full">
                          <video src={filePreview} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Film className="w-4 h-4 text-white/80" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-300 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {fileType?.toUpperCase()}
                      </p>
                    </div>

                    {/* Delete file */}
                    {!isSubmitting && (
                      <button 
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Remove file"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Submit Button & Progress */}
            <div className="border-t border-slate-800 pt-4 mt-4 shrink-0 flex flex-col gap-3">
              {isSubmitting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest leading-none">
                    <span>Uploading attachments...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-100"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                {!isSubmitting && (
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 transition"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700/40 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending</span>
                    </>
                  ) : (
                    <span>Submit</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
