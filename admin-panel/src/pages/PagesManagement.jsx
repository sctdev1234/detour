import axios from 'axios';
import { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PAGE_TYPES = [
    { value: 'terms', label: 'Terms and Conditions' },
    { value: 'privacy', label: 'Privacy Policy' },
    { value: 'contact', label: 'Contact Us' },
    { value: 'about', label: 'About Us' },
    { value: 'help', label: 'Help' },
    { value: 'faq', label: 'FAQ' }
];

export default function PagesManagement() {
    const [selectedPage, setSelectedPage] = useState(PAGE_TYPES[0].value);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch page content when selectedPage changes
    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            setMessage('');
            try {
                const response = await axios.get(`${API_URL}/pages/${selectedPage}`);
                if (response.data.success) {
                    // The API might return content as an object or string.
                    // For rich text, it should typically be a string. 
                    // If it's empty, default to empty string.
                    const fetchedContent = response.data.data.content;
                    setContent(typeof fetchedContent === 'string' ? fetchedContent : JSON.stringify(fetchedContent, null, 2) || '');
                }
            } catch (error) {
                console.error('Error fetching page content:', error);
                setMessage('Failed to load page content.');
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
    }, [selectedPage]);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(
                `${API_URL}/pages/${selectedPage}`,
                { content },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                setMessage('Page updated successfully!');
                // Clear success message after 3 seconds
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error updating page:', error);
            setMessage(error.response?.data?.message || 'Failed to update page.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Pages Management
                </h1>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <div className={`p-4 mb-4 rounded-lg flex items-center gap-2 ${message.includes('success') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    <span className="font-medium">{message}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col">
                <div className="mb-6">
                    <label htmlFor="page-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Page to Edit
                    </label>
                    <select
                        id="page-select"
                        value={selectedPage}
                        onChange={(e) => setSelectedPage(e.target.value)}
                        disabled={loading || saving}
                        className="w-full md:w-1/3 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        {PAGE_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 flex flex-col h-[500px]">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 bg-white">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                className="h-full pb-10"
                                modules={{
                                    toolbar: [
                                        [{ 'header': [1, 2, 3, false] }],
                                        ['bold', 'italic', 'underline', 'strike'],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                        ['link', 'image'],
                                        ['clean']
                                    ]
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
