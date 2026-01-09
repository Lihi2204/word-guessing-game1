'use client';

import { useState, useEffect } from 'react';

interface Word {
  word: string;
  category: string;
  descriptions: {
    easy: string;
    medium: string;
    hard: string;
  };
  hint: string;
  synonyms: string[];
}

interface Category {
  id: string;
  name: string;
}

interface WordsData {
  metadata: {
    totalWords: number;
    categories: number;
  };
  categories: Category[];
  words: {
    easy: Word[];
    medium: Word[];
    hard: Word[];
  };
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<WordsData | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingWord, setEditingWord] = useState<{ word: Word; difficulty: Difficulty } | null>(null);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Check for stored password on mount
  useEffect(() => {
    const saved = localStorage.getItem('adminPassword');
    if (saved) {
      setStoredPassword(saved);
      verifyPassword(saved);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyPassword = async (pwd: string) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const result = await res.json();
      if (result.success) {
        setIsAuthenticated(true);
        setStoredPassword(pwd);
        localStorage.setItem('adminPassword', pwd);
        await loadData(pwd);
      } else {
        setError(result.error || 'סיסמה שגויה');
        localStorage.removeItem('adminPassword');
      }
    } catch {
      setError('שגיאה בהתחברות');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await verifyPassword(password);
  };

  const loadData = async (pwd: string) => {
    try {
      const res = await fetch('/api/admin/words', {
        headers: { 'x-admin-password': pwd },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setStoredPassword('');
    setPassword('');
    localStorage.removeItem('adminPassword');
  };

  const getFilteredWords = () => {
    if (!data) return [];

    const difficulties: Difficulty[] = filterDifficulty === 'all'
      ? ['easy', 'medium', 'hard']
      : [filterDifficulty];

    const words: { word: Word; difficulty: Difficulty }[] = [];

    difficulties.forEach(diff => {
      data.words[diff].forEach(word => {
        if (filterCategory !== 'all' && word.category !== filterCategory) return;
        if (searchTerm && !word.word.includes(searchTerm)) return;
        words.push({ word, difficulty: diff });
      });
    });

    return words.sort((a, b) => a.word.word.localeCompare(b.word.word, 'he'));
  };

  const handleDeleteWord = async (word: string, difficulty: Difficulty) => {
    if (!confirm(`למחוק את המילה "${word}"?`)) return;

    try {
      const res = await fetch('/api/admin/words', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': storedPassword,
        },
        body: JSON.stringify({ word, difficulty }),
      });
      if (res.ok) {
        await loadData(storedPassword);
      }
    } catch {
      alert('שגיאה במחיקה');
    }
  };

  const getCategoryName = (id: string) => {
    return data?.categories.find(c => c.id === id)?.name || id;
  };

  const getDifficultyName = (diff: Difficulty) => {
    const names = { easy: 'קל', medium: 'בינוני', hard: 'קשה' };
    return names[diff];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">ניהול מילים</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="סיסמה..."
              className="w-full px-4 py-3 border rounded-lg mb-4 text-right"
              dir="rtl"
            />
            {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold"
            >
              כניסה
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">ניהול מילים</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setIsManagingCategories(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
              >
                ניהול קטגוריות
              </button>
              <button
                onClick={() => setIsAddingWord(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                + הוסף מילה
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                יציאה
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4 text-sm text-gray-600">
            <span>סה״כ מילים: {data?.metadata.totalWords}</span>
            <span>קטגוריות: {data?.metadata.categories}</span>
          </div>

          {/* Migration button - always show */}
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800 mb-2">
              {data?.metadata.totalWords === 0
                ? 'לא נמצאו מילים בדאטאבייס. לחץ להעברת המילים מה-JSON:'
                : 'לחץ להעברה מחדש של כל המילים מה-JSON (ידרוס נתונים קיימים):'}
            </p>
            <button
              onClick={async () => {
                if (!confirm('להעביר את כל המילים מה-JSON לדאטאבייס?')) return;
                setIsMigrating(true);
                try {
                  const res = await fetch('/api/admin/migrate', {
                    method: 'POST',
                    headers: { 'x-admin-password': storedPassword },
                  });
                  const result = await res.json();
                  if (result.success) {
                    let message = `הועברו ${result.wordsInserted} מילים ו-${result.categoriesInserted} קטגוריות`;
                    if (result.totalErrors > 0) {
                      message += `\n(${result.totalErrors} שגיאות)`;
                    }
                    alert(message);
                    loadData(storedPassword);
                  } else {
                    let errorMessage = result.error || 'Unknown error';
                    if (result.details) {
                      errorMessage += '\n\nפרטים:\n' + result.details.slice(0, 5).join('\n');
                    }
                    alert('שגיאה: ' + errorMessage);
                  }
                } catch (err) {
                  alert('שגיאת רשת: ' + (err instanceof Error ? err.message : 'Unknown error'));
                } finally {
                  setIsMigrating(false);
                }
              }}
              disabled={isMigrating}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                isMigrating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-yellow-500 hover:bg-yellow-600'
              }`}
            >
              {isMigrating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  מעביר 410 מילים... אנא המתן
                </span>
              ) : (
                'העבר מילים לדאטאבייס'
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש מילה..."
              className="px-4 py-2 border rounded-lg flex-1 min-w-[200px]"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">כל הקטגוריות</option>
              {data?.categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | 'all')}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">כל הרמות</option>
              <option value="easy">קל</option>
              <option value="medium">בינוני</option>
              <option value="hard">קשה</option>
            </select>
          </div>
        </div>

        {/* Words List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right">מילה</th>
                  <th className="px-4 py-3 text-right">קטגוריה</th>
                  <th className="px-4 py-3 text-right">רמה</th>
                  <th className="px-4 py-3 text-right">תיאור קל</th>
                  <th className="px-4 py-3 text-right">תיאור בינוני</th>
                  <th className="px-4 py-3 text-right">תיאור קשה</th>
                  <th className="px-4 py-3 text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredWords().map(({ word, difficulty }, idx) => (
                  <tr key={`${word.word}-${idx}`} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{word.word}</td>
                    <td className="px-4 py-3">{getCategoryName(word.category)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {getDifficultyName(difficulty)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{word.descriptions.easy}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{word.descriptions.medium}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{word.descriptions.hard}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingWord({ word, difficulty })}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          עריכה
                        </button>
                        <button
                          onClick={() => handleDeleteWord(word.word, difficulty)}
                          className="text-red-500 hover:text-red-700"
                        >
                          מחיקה
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 text-sm text-gray-600">
            מציג {getFilteredWords().length} מילים
          </div>
        </div>
      </div>

      {/* Word Editor Modal */}
      {(editingWord || isAddingWord) && (
        <WordEditorModal
          word={editingWord?.word}
          difficulty={editingWord?.difficulty}
          categories={data?.categories || []}
          password={storedPassword}
          onClose={() => {
            setEditingWord(null);
            setIsAddingWord(false);
          }}
          onSave={() => {
            setEditingWord(null);
            setIsAddingWord(false);
            loadData(storedPassword);
          }}
        />
      )}

      {/* Category Manager Modal */}
      {isManagingCategories && (
        <CategoryManagerModal
          categories={data?.categories || []}
          password={storedPassword}
          onClose={() => setIsManagingCategories(false)}
          onUpdate={() => loadData(storedPassword)}
        />
      )}
    </div>
  );
}

// Word Editor Modal Component
function WordEditorModal({
  word,
  difficulty,
  categories,
  password,
  onClose,
  onSave,
}: {
  word?: Word;
  difficulty?: Difficulty;
  categories: Category[];
  password: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEditing = !!word;
  const [formData, setFormData] = useState({
    word: word?.word || '',
    category: word?.category || categories[0]?.id || '',
    descEasy: word?.descriptions.easy || '',
    descMedium: word?.descriptions.medium || '',
    descHard: word?.descriptions.hard || '',
    hint: word?.hint || '',
    synonyms: word?.synonyms.join(', ') || '',
    difficulty: difficulty || 'easy' as Difficulty,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const wordData: Word = {
      word: formData.word,
      category: formData.category,
      descriptions: {
        easy: formData.descEasy,
        medium: formData.descMedium,
        hard: formData.descHard,
      },
      hint: formData.hint,
      synonyms: formData.synonyms.split(',').map(s => s.trim()).filter(s => s),
    };

    try {
      if (isEditing) {
        const res = await fetch('/api/admin/words', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify({
            originalWord: word!.word,
            originalDifficulty: difficulty,
            updatedWord: wordData,
            newDifficulty: formData.difficulty,
          }),
        });
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error);
        }
      } else {
        const res = await fetch('/api/admin/words', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify({
            word: wordData,
            difficulty: formData.difficulty,
          }),
        });
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error);
        }
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירה');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {isEditing ? 'עריכת מילה' : 'הוספת מילה חדשה'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">מילה</label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">קטגוריה</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">רמת קושי</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="easy">קל</option>
                <option value="medium">בינוני</option>
                <option value="hard">קשה</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">תיאור קל</label>
              <textarea
                value={formData.descEasy}
                onChange={(e) => setFormData({ ...formData, descEasy: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">תיאור בינוני</label>
              <textarea
                value={formData.descMedium}
                onChange={(e) => setFormData({ ...formData, descMedium: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">תיאור קשה</label>
              <textarea
                value={formData.descHard}
                onChange={(e) => setFormData({ ...formData, descHard: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">רמז</label>
              <input
                type="text"
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">מילים נרדפות (מופרדות בפסיק)</label>
              <input
                type="text"
                value={formData.synonyms}
                onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="מילה1, מילה2"
              />
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Category Manager Modal Component
function CategoryManagerModal({
  categories,
  password,
  onClose,
  onUpdate,
}: {
  categories: Category[];
  password: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [newCatId, setNewCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [error, setError] = useState('');

  const handleAddCategory = async () => {
    if (!newCatId.trim() || !newCatName.trim()) return;
    setError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ id: newCatId.trim(), name: newCatName.trim() }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      setNewCatId('');
      setNewCatName('');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'שגיאה בהוספה');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCat) return;
    setError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          originalId: editingCat.id,
          newId: editingCat.id,
          newName: editingCat.name,
        }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      setEditingCat(null);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('למחוק את הקטגוריה?')) return;
    setError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקה');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">ניהול קטגוריות</h2>

          {/* Add new category */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">הוספת קטגוריה חדשה</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value)}
                placeholder="מזהה (באנגלית)"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="שם (בעברית)"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                הוסף
              </button>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

          {/* Categories list */}
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 p-3 border rounded-lg">
                {editingCat?.id === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editingCat.name}
                      onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <button
                      onClick={handleUpdateCategory}
                      className="text-green-500 hover:text-green-700"
                    >
                      שמור
                    </button>
                    <button
                      onClick={() => setEditingCat(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ביטול
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-gray-400 text-sm mr-2">({cat.id})</span>
                    </span>
                    <button
                      onClick={() => setEditingCat({ ...cat })}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      מחיקה
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
