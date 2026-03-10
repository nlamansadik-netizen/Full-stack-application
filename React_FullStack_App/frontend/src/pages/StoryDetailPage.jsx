import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api'

function StoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [story, setStory] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    const loadStory = async () => {
      try {
        const data = await apiFetch(`/api/stories/${id}`, { token })
        setStory(data)
        setTitle(data.title)
        setDescription(data.description)
        setCategory(data.category)
      } catch (err) {
        if (err.message === 'Could not validate credentials') {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }
        setError(`Story load failed: ${err.message}`)
      }
    }

    loadStory()
  }, [id, navigate, token])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSavedMessage('')

    try {
      const updated = await apiFetch(`/api/stories/${id}`, {
        method: 'PUT',
        token,
        body: { title, description, category },
      })
      setStory(updated)
      setSavedMessage('Story updated successfully.')
    } catch (err) {
      setError(`Update failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="page">
      <div className="card">
        <div className="top-row">
          <p>
            <Link to="/stories">Back to stories</Link>
          </p>
          <button onClick={logout}>Logout</button>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {savedMessage ? <p className="success">{savedMessage}</p> : null}

        {!story && !error ? <p>Loading...</p> : null}

        {story ? (
          <form onSubmit={handleSave} className="story-form">
            <h1>Edit Story</h1>

            <label>Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <label>Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />

            <label>Category</label>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            />

            <p>
              <strong>Created By:</strong> {story.createdBy}
            </p>
            <p>
              <strong>Created At:</strong> {new Date(story.createdAt).toLocaleString()}
            </p>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}

export default StoryDetailPage
