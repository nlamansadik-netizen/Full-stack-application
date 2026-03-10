import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await apiFetch('/api/register', {
        method: 'POST',
        body: { username, password },
      })
      navigate('/login')
    } catch (err) {
      setError(`Registration failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card auth-card">
        <h1>Create Account</h1>
        <p>Pick a username and password for this demo app.</p>

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={6}
            required
          />

          <button disabled={loading} type="submit">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <p className="helper-text">
          Already have an account? <Link to="/login">Go to login</Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
