import React, { useState, useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { UploadCloud, FileText, Trash2, CheckCircle2, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { saveEncryptedFile, getEncryptedFile, deleteFileFromDB } from '../../utils/indexedDbUtils';
import { encryptData, decryptData } from '../../utils/cryptoUtils';

const DocumentVault = ({ documents, onAdd, onDelete }) => {
  const { sessionKey } = useContext(FinanceContext);
  
  const [docType, setDocType] = useState('Recibo Médico');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
    }
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !sessionKey) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = event.target.result; // data:...;base64,...
        const id = crypto.randomUUID();
        
        // 1. Encrypt the file data
        const encrypted = await encryptData(base64Data, sessionKey);
        
        // 2. Save encrypted payload in IndexedDB
        await saveEncryptedFile(id, encrypted);
        
        // 3. Save metadata in context
        onAdd({
          id,
          name: selectedFile.name,
          type: docType,
          date: new Date().toISOString().split('T')[0],
          size: formatFileSize(selectedFile.size)
        });

        setSelectedFile(null);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } catch (err) {
        console.error("Failed to encrypt and upload document:", err);
        alert("Erro ao criptografar o comprovante.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleDownload = async (doc) => {
    if (!sessionKey) return;
    
    setDownloadingId(doc.id);
    try {
      // 1. Get encrypted payload from IndexedDB
      const encrypted = await getEncryptedFile(doc.id);
      if (!encrypted) {
        alert("Arquivo correspondente não encontrado no cofre.");
        setDownloadingId(null);
        return;
      }
      
      // 2. Decrypt the file payload
      const decryptedBase64 = await decryptData(encrypted, sessionKey);
      
      // 3. Initiate local browser download
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", decryptedBase64);
      downloadAnchor.setAttribute("download", doc.name);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Failed to download and decrypt file:", err);
      alert("Erro ao descriptografar o comprovante para download.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc) => {
    if (confirm(`Remover o documento "${doc.name}" do cofre? Esta ação é definitiva.`)) {
      try {
        // 1. Delete from IndexedDB
        await deleteFileFromDB(doc.id);
        // 2. Delete metadata from state context
        onDelete(doc.id);
      } catch (err) {
        console.error("Failed to delete file from DB:", err);
        // Fallback: delete from state anyway
        onDelete(doc.id);
      }
    }
  };

  return (
    <div className="vault-grid animate-fade-in">
      {/* Upload panel */}
      <div className="card details-card flex-column">
        <h3>Arquivar Comprovante / Recibo</h3>
        <p className="card-subtext mb-lg">Guarde recibos de saúde ou instrução para garantir o reembolso e dedutibilidade do imposto de renda.</p>
        
        <form onSubmit={handleDocUpload} className="flex-column gap-md">
          <div className="form-group">
            <label htmlFor="doc-file" className="btn btn-secondary btn-sm custom-file-upload flex-center" style={{ width: '100%', padding: '12px' }}>
              <UploadCloud size={18} style={{ marginRight: 8 }} />
              {selectedFile ? 'Trocar Arquivo Selecionado' : 'Selecionar Documento Real'}
              <input 
                id="doc-file"
                type="file" 
                onChange={handleFileSelection} 
                style={{ display: 'none' }}
                required={!selectedFile}
                disabled={loading}
              />
            </label>
            {selectedFile && (
              <span className="text-xs text-accent mt-xs font-semibold block text-center truncate">
                Arquivo: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="doc-type">Tipo de Documento</label>
            <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)} disabled={loading}>
              <option value="Recibo Médico">Recibo Médico (Saúde)</option>
              <option value="Comprovante Escolar">Comprovante Escolar (Instrução)</option>
              <option value="Declaração IRPF">Declaração IRPF antiga</option>
              <option value="Extrato de Conta">Extrato de Conta / Notas</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary flex-center mt-md" disabled={loading || !selectedFile}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} />
                <span>Criptografando arquivo...</span>
              </>
            ) : (
              <>
                <UploadCloud size={18} style={{ marginRight: 8 }} />
                <span>Subir e Criptografar Recibo</span>
              </>
            )}
          </button>

          {uploadSuccess && (
            <div className="alert-message success-alert flex-center-y mt-sm animate-scale-up">
              <CheckCircle2 className="text-success" size={18} style={{ marginRight: 8 }} />
              <span className="text-xs">Documento criptografado e salvo no cofre com sucesso!</span>
            </div>
          )}
        </form>

        <div className="security-tag-footer flex-center-y text-secondary text-xxs mt-xl pt-md border-top">
          <ShieldCheck className="text-success" size={14} style={{ marginRight: 6 }} />
          <span>Criptografado localmente utilizando Web Crypto API AES-GCM 256 bits</span>
        </div>
      </div>

      {/* Document list */}
      <div className="card details-card main-col flex-grow">
        <h3>Documentos Arquivados</h3>
        <div className="documents-list-rows mt-md">
          {documents.map(doc => (
            <div key={doc.id} className="doc-row flex-between flex-center-y">
              <div className="doc-row-details flex-center-y">
                <div className="doc-icon-circle flex-center">
                  <FileText size={20} className="text-accent" />
                </div>
                <div>
                  <p className="doc-title font-semibold text-sm">{doc.name}</p>
                  <p className="doc-meta text-xs text-secondary">
                    {doc.type} • {doc.size} • Enviado em: {doc.date.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>
              
              <div className="flex-center-y gap-md">
                <button
                  className="download-icon-btn flex-center"
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId !== null}
                  title="Baixar comprovante descriptografado"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '6px' }}
                >
                  {downloadingId === doc.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                </button>
                <button 
                  className="delete-icon-btn" 
                  onClick={() => handleDelete(doc)}
                  disabled={downloadingId !== null}
                  title="Remover do cofre"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <p className="empty-state text-sm text-secondary italic">Nenhum comprovante arquivado no cofre.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentVault;
