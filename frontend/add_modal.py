import os
import re

filepath = r'c:\Users\HP ELITEBOOK\Downloads\PME\frontend\src\App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variable
if 'const [generatedEmailModal' not in content:
    content = content.replace("const [errorMsg, setErrorMsg] = useState('');", "const [errorMsg, setErrorMsg] = useState('');\n  const [generatedEmailModal, setGeneratedEmailModal] = useState<string | null>(null);")

# 2. Update button logic
old_btn = """                  <button 
                    onClick={() => {
                      alert("L'IA a généré un e-mail de relance poli et l'a copié dans votre presse-papiers !");
                    }}"""
new_btn = """                  <button 
                    onClick={() => {
                      const emailText = "Objet : Relance de paiement - Factures en souffrance\\n\\nBonjour,\\n\\nSauf erreur ou omission de notre part, nous constatons que certaines de vos factures (montant estimé : 1.7M FCFA) sont arrivées à échéance.\\n\\nPourriez-vous nous faire un retour sur l'état de leur règlement s'il vous plaît ?\\nSi le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.\\n\\nCordialement,\\nL'équipe Financière";
                      navigator.clipboard.writeText(emailText).then(() => {
                        showToast("E-mail généré et copié !", "success");
                        setGeneratedEmailModal(emailText);
                      });
                    }}"""
content = content.replace(old_btn, new_btn)

# 3. Add Modal
modal_code = """
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
"""
if 'Modal Email Généré' not in content:
    content = content.replace('{/* FLOATING SUPPORT CHAT WIDGET */}', modal_code + '\n      {/* FLOATING SUPPORT CHAT WIDGET */}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied safely.")
