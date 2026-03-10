import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: { username, password },
      })

      localStorage.setItem('token', data.access_token)
      navigate('/stories')
    } catch (err) {
      setError(`Login failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card auth-card">
        <h1>Intern Story App</h1>
        <p>Login with your registered username and password.</p>

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button disabled={loading} type="submit">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <p className="helper-text">
          New intern? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
