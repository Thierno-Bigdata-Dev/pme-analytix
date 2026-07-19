import sys
import os

def patch_app_tsx():
    filepath = r"C:\Users\HP ELITEBOOK\Downloads\PME\frontend\src\App.tsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add states
    state_injection = """  const [generatedEmailModal, setGeneratedEmailModal] = useState<string | null>(null);
  const [deleteTxModal, setDeleteTxModal] = useState<number | null>(null);
  const [editTxModal, setEditTxModal] = useState<Transaction | null>(null);
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxMontant, setEditTxMontant] = useState('');
  const [editTxType, setEditTxType] = useState<'credit'|'debit'>('credit');
  const [editTxCategorie, setEditTxCategorie] = useState('');
  const [editTxCustomCategorie, setEditTxCustomCategorie] = useState('');
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxSubmitting, setEditTxSubmitting] = useState(false);"""
    
    content = content.replace("  const [generatedEmailModal, setGeneratedEmailModal] = useState<string | null>(null);", state_injection)

    # 2. Replace handleDeleteTransaction & add confirmDeleteTransaction / handleSaveEdit
    old_delete = """  const handleDeleteTransaction = async (transactionId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?")) {
      return;
    }
    try {
      await api.deleteTransaction(pmeId, transactionId);
      await loadDashboardData();
    } catch (err: any) {
      showToast("Erreur lors de la suppression : " + err.message, "error");
    }
  };"""
    
    new_handlers = """  const confirmDeleteTransaction = async (transactionId: number) => {
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
  };"""
    
    content = content.replace(old_delete, new_handlers)

    # 3. Fix the onClick logic for Edit
    old_edit_click = """                                onClick={() => {
                                  // Remplir le formulaire avec les données
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
                                }}"""
                                
    new_edit_click = """                                onClick={() => {
                                  setEditTxModal(tx);
                                  setEditTxDate(tx.date);
                                  setEditTxMontant(tx.montant.toString());
                                  setEditTxType(tx.type === 'credit' ? 'credit' : 'debit');
                                  const isStandardCat = ["Ventes", "Salaires", "Loyer", "Achat Matières", "Marketing", "Impôts", "Services Publics", "Carburant", "Entretien", "Télécom"].includes(tx.categorie);
                                  if (isStandardCat) {
                                    setEditTxCategorie(tx.categorie);
                                    setEditTxCustomCategorie('');
                                  } else {
                                    setEditTxCategorie('Autre');
                                    setEditTxCustomCategorie(tx.categorie);
                                  }
                                  setEditTxDescription(tx.description || '');
                                }}"""
                                
    content = content.replace(old_edit_click, new_edit_click)
    
    # 4. Fix the onClick logic for Delete
    content = content.replace("onClick={() => handleDeleteTransaction(tx.id)}", "onClick={() => setDeleteTxModal(tx.id)}")

    # 5. Append Modals
    modals_jsx = """      {/* Modal Edit Transaction */}
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
"""
    
    # insert before {/* Modal Email Généré */}
    content = content.replace("{/* Modal Email Généré */}", modals_jsx + "\n      {/* Modal Email Généré */}")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Patch applied successfully.")

if __name__ == '__main__':
    patch_app_tsx()
