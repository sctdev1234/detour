import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function DocumentModal({ user, onClose }) {
  if (!user) return null;

  // Documents array might be empty or undefined
  const docs = user.documents && user.documents.length > 0 ? user.documents[user.documents.length - 1] : null;

  const docTypes = [
    { key: 'facePhoto', label: 'Face Photo' },
    { key: 'cinFront', label: 'ID Card (Front)' },
    { key: 'cinBack', label: 'ID Card (Back)' },
    { key: 'license', label: 'Driver License' },
    { key: 'carRegistration', label: 'Car Registration' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
            <div>
              <h2 className="text-xl font-semibold text-white">User Documents</h2>
              <p className="text-sm text-slate-400 mt-1">
                Viewing documents for <span className="text-blue-400 font-medium">{user.fullName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {!docs ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium">No documents uploaded</p>
                <p className="text-sm">This user hasn't submitted any verification documents yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {docTypes.map((type) => (
                  <div key={type.key} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all">
                    <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                        {type.label}
                    </h3>
                    <div className="aspect-video w-full bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 group relative">
                      {docs[type.key] ? (
                        <>
                            <img 
                                src={docs[type.key]} 
                                alt={type.label} 
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                 onClick={() => window.open(docs[type.key], '_blank')}
                            >
                                <span className="px-4 py-2 bg-white/10 backdrop-blur rounded-lg text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/20">
                                    View Full Size
                                </span>
                            </div>
                        </>
                      ) : (
                        <div className="text-slate-600 flex flex-col items-center gap-2">
                           <span className="text-xs font-medium uppercase tracking-wider">Not Uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
             {/* Submission Date */}
             {docs && docs.submittedAt && (
                <div className="mt-8 pt-6 border-t border-slate-700/50 text-right">
                    <p className="text-xs text-slate-500">
                        Documents submitted on <span className="text-slate-400 font-medium">{new Date(docs.submittedAt).toLocaleDateString()} at {new Date(docs.submittedAt).toLocaleTimeString()}</span>
                    </p>
                </div>
             )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
