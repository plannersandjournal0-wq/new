import { useState, useEffect } from 'react';
import { Upload, FileText, Settings, Eye, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function TemplateManagement({ standalone = true }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showFieldMapper, setShowFieldMapper] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/templates`);
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    const title = prompt('Enter template title:');
    if (!title) return;

    const productSlug = prompt('Enter product slug (e.g., "lunas-adventure"):');
    if (!productSlug) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('productSlug', productSlug);
    formData.append('description', '');

    try {
      const response = await fetch(`${API_URL}/api/templates/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const template = await response.json();
      toast.success('Template uploaded successfully!');
      fetchTemplates();
      setSelectedTemplate(template);
      setShowFieldMapper(true);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const updateTemplateStatus = async (templateId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Status update failed');
      }

      toast.success(`Template ${newStatus}`);
      fetchTemplates();
    } catch (error) {
      console.error('Status update failed:', error);
      toast.error(error.message);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) return;

    try {
      const response = await fetch(`${API_URL}/api/templates/${templateId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Delete failed');
      }

      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      inactive: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      archived: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header - only show if standalone */}
      {standalone && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
            </div>
            <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
              <Upload size={20} />
              {uploading ? 'Uploading...' : 'Upload Template'}
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      )}

      {/* Header for embedded mode */}
      {!standalone && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
            <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
              <Upload size={20} />
              {uploading ? 'Uploading...' : 'Upload Template'}
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No templates yet</p>
            <p className="text-gray-500 text-sm mt-2">Upload a fillable PDF to get started</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onStatusChange={updateTemplateStatus}
                onDelete={deleteTemplate}
                onViewDetails={(t) => {
                  setSelectedTemplate(t);
                  setShowFieldMapper(true);
                }}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}
      </div>

      {/* Field Mapper Modal */}
      {showFieldMapper && selectedTemplate && (
        <FieldMapperModal
          template={selectedTemplate}
          onClose={() => {
            setShowFieldMapper(false);
            setSelectedTemplate(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onStatusChange, onDelete, onViewDetails, getStatusBadge }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">{template.title}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(template.status)}`}>
              {template.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Product: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{template.productSlug}</span>
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{template.pageCount} pages</span>
            <span>•</span>
            <span>{template.fillableFields?.length || 0} fillable fields</span>
            <span>•</span>
            <span>{template.fieldMappings?.length || 0} fields mapped</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(template)}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="View & Map Fields"
          >
            <Settings size={20} />
          </button>

          {template.status !== 'active' && (
            <button
              onClick={() => onStatusChange(template.id, 'active')}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Activate"
            >
              <Check size={20} />
            </button>
          )}

          {template.status === 'active' && (
            <button
              onClick={() => onStatusChange(template.id, 'inactive')}
              className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
              title="Deactivate"
            >
              <X size={20} />
            </button>
          )}

          {template.status !== 'active' && (
            <button
              onClick={() => onDelete(template.id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldMapperModal({ template, onClose }) {
  const [fieldMappings, setFieldMappings] = useState(template.fieldMappings || []);
  const [saving, setSaving] = useState(false);

  const toggleFieldMapping = (fieldName) => {
    const existing = fieldMappings.find(m => m.pdfFieldName === fieldName);
    if (existing) {
      // Remove mapping
      setFieldMappings(fieldMappings.filter(m => m.pdfFieldName !== fieldName));
    } else {
      // Add mapping
      setFieldMappings([...fieldMappings, {
        pdfFieldName: fieldName,
        variableType: 'requestedName',
        fallbackValue: ''
      }]);
    }
  };

  const saveMappings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldMappings })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save mappings');
      }

      toast.success('Field mappings saved!');
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const isMapped = (fieldName) => fieldMappings.some(m => m.pdfFieldName === fieldName);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Field Mapping</h2>
          <p className="text-sm text-gray-600 mt-1">{template.title}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Click fields</strong> to map them to <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">requestedName</span>
                <br />
                Mapped fields will be filled with the customer's personalization name.
              </p>
            </div>
          </div>

          {template.fillableFields && template.fillableFields.length > 0 ? (
            <div className="space-y-3">
              {template.fillableFields.map((field, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleFieldMapping(field.fieldName)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isMapped(field.fieldName)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {field.fieldName}
                        </span>
                        {isMapped(field.fieldName) && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                            Mapped to requestedName
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Page {field.pageNumber} • {field.fieldType}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isMapped(field.fieldName)
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {isMapped(field.fieldName) && (
                        <Check size={16} className="text-white" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No fillable fields detected in this PDF
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Summary:</strong> {fieldMappings.length} of {template.fillableFields?.length || 0} fields mapped
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveMappings}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateManagement;