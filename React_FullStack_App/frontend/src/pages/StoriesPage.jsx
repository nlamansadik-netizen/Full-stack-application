import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, buildStoriesQuery } from '../api'

function StoriesPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [stories, setStories] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [filterCategory, setFilterCategory] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState('newest')
  const [limit, setLimit] = useState('10')
  const [totalMatched, setTotalMatched] = useState(0)
  const [returnedCount, setReturnedCount] = useState(0)

  const loadStories = async () => {
    try {
      const storyResponse = await apiFetch(
        buildStoriesQuery({
          category: filterCategory,
          q: keyword,
          sort,
          limit,
        }),
        { token }
      )

      setStories(storyResponse.items || [])
      setTotalMatched(storyResponse.totalMatched || 0)
      setReturnedCount(storyResponse.returnedCount || 0)
    } catch (err) {
      throw err
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await apiFetch('/api/me', { token })
        setCurrentUser(me)
        await loadStories()
      } catch (err) {
        const authError =
          err.message === 'Could not validate credentials' ||
          err.message === 'Invalid username or password'

        if (authError) {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }

        setError(`Could not load stories: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [navigate, token])

  useEffect(() => {
    const refreshStories = async () => {
      try {
        setError('')
        await loadStories()
      } catch (err) {
        setError(`Could not load stories: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (currentUser) {
      refreshStories()
    }
  }, [filterCategory, keyword, sort, limit])

  const handleCreateStory = async (event) => {
    event.preventDefault()
    setError('')

    try {
      await apiFetch('/api/stories', {
        method: 'POST',
        token,
        body: { title, description, category },
      })

      setTitle('')
      setDescription('')
      setCategory('General')

      await loadStories()
    } catch (err) {
      setError(`Could not create story: ${err.message}`)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  if (loading) {
    return <div className="page">Loading stories...</div>
  }

  return (
    <div className="page">
      <div className="card">
        <div className="top-row">
          <h1>My Stories</h1>
          <button onClick={logout}>Logout</button>
        </div>

        <p>Logged in as: {currentUser?.username}</p>

        <form onSubmit={handleCreateStory} className="story-form">
          <h2>Create Story</h2>

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
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          >
            <option value="General">General</option>
            <option value="Learning">Learning</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
          </select>

          <button type="submit">Create</button>
        </form>

        <div className="story-form">
          <h2>Filter Stories</h2>

          <label>Category</label>
          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
          >
            <option value="">All</option>
            <option value="General">General</option>
            <option value="Learning">Learning</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
          </select>

          <label>Keyword</label>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search title or description"
          />

          <label>Sort</label>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>

          <label>Limit</label>
          <select
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <h2>Your Story List</h2>
        <p>{returnedCount} stories found{totalMatched !== returnedCount ? ` (matched ${totalMatched} total)` : ''}</p>

        {stories.length === 0 ? <p>No stories yet.</p> : null}

        <ul className="story-list">
          {stories.map((story) => (
            <li key={story.id}>
              <Link to={`/stories/${story.id}`}>{story.title} (View/Edit)</Link>
              <span>{story.category}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default StoriesPage
