import { useState } from 'react';
import styles from '../styles/Admin.module.css';

export default function ConvertDocument() {
  const [file, setFile] = useState(null);
  const [conversionStatus, setConversionStatus] = useState('');
  const [jsonResult, setJsonResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.docx')) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a .docx file');
      setFile(null);
    }
  };

  const convertDocument = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setConversionStatus('Converting...');
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/convert-to-exam', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        setConversionStatus('Conversion successful!');
        setJsonResult(result);
      } else {
        setError(result.error || 'Conversion failed');
        setConversionStatus('');
      }
    } catch (err) {
      setError('Error during conversion: ' + err.message);
      setConversionStatus('');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2>Convert Word Document to Exam Format</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Upload a .docx file to automatically convert it to exam format with questions, options, images, and sections.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="file"
            accept=".docx"
            onChange={handleFileChange}
            style={{ marginBottom: '10px' }}
          />
          <button
            className={styles.button}
            onClick={convertDocument}
            disabled={!file}
            style={{ marginLeft: '10px' }}
          >
            Convert Document
          </button>
        </div>

        {conversionStatus && (
          <div style={{ padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '20px' }}>
            {conversionStatus}
          </div>
        )}

        {error && (
          <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {jsonResult && (
          <div style={{ marginTop: '20px' }}>
            <h3>Conversion Result:</h3>
            <pre style={{ 
              background: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(jsonResult, null, 2)}
            </pre>
            <button
              className={styles.button}
              onClick={() => {
                const blob = new Blob([JSON.stringify(jsonResult, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'converted-exam.json';
                a.click();
              }}
              style={{ marginTop: '10px' }}
            >
              Download JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
