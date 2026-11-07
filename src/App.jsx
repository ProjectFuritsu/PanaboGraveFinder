import { useEffect, useMemo, useState } from 'react'
import { supabase } from './utils/supabase'
import './App.css'

function formatLifespan(birthDate, deathDate) {
  const birthYear = birthDate?.slice(0, 4)
  const deathYear = deathDate?.slice(0, 4)

  if (!birthYear && !deathYear) return 'Dates unavailable'
  return `${birthYear || 'Unknown'} – ${deathYear || 'Present'}`
}

function App() {
  const [page, setPage] = useState('home')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const [burials, setBurials] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function getBurials() {
      setLoading(true)
      setLoadError('')

      try {
        const { data, error } = await supabase
          .from('burials')
          .select('id, full_name, birth_date, death_date, quadrant_id, lot_no')
          .eq('is_published', true)

        if (error) {
          throw new Error(error.message)
        }

        if (active) {
          setBurials(data ?? [])
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'An unexpected error occurred.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    getBurials()

    return () => {
      active = false
    }
  }, [reloadKey])

  const visibleBurials = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    return burials
      .filter((burial) => burial.full_name.toLocaleLowerCase().includes(query))
      .sort((first, second) => {
        if (sortBy === 'name-desc') return second.full_name.localeCompare(first.full_name)
        if (sortBy === 'location') {
          return first.quadrant_id.localeCompare(second.quadrant_id)
            || first.lot_no.localeCompare(second.lot_no, undefined, { numeric: true })
            || first.full_name.localeCompare(second.full_name)
        }
        return first.full_name.localeCompare(second.full_name)
      })
  }, [burials, search, sortBy])

  const openBurials = () => {
    setPage('burials')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault()
            setPage('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span className="brand-icon" aria-hidden="true">✳</span>
          <span>Panabo <strong>Memorial</strong></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={page === 'home' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('home')}>Home</button>
          <button className={page === 'burials' ? 'nav-link active' : 'nav-link'} onClick={openBurials}>Burials</button>
        </nav>
        <span className="header-spacer" aria-hidden="true" />
      </header>

      <main>
        {page === 'home' ? (
          <section className="about-page" id="home">
            <div className="about-card">
              <div className="about-symbol" aria-hidden="true">✿</div>
              <p className="eyebrow">ABOUT US</p>
              <h1>A place to remember.<br />Find your loved ones.</h1>
              <p className="about-copy">
                Panabo Memorial helps families find the resting place of someone they love.
                Browse the burial directory and use its simple location markers to know where to go.
              </p>
              <button className="primary-button" onClick={openBurials}>Browse burials <span>→</span></button>
              <p className="about-note">A thoughtful guide for remembering the people who matter.</p>
            </div>
            <div className="home-footnote">
              <span>✳</span> Panabo Memorial <i /> A place for remembrance
            </div>
          </section>
        ) : (
          <section className="burials-page" id="burials">
            <div className="page-heading">
              <div>
                <p className="eyebrow">MEMORIAL DIRECTORY</p>
                <h1>Burials</h1>
                <p className="page-description">Find a loved one and see their location marker.</p>
              </div>
              <div className="record-count">
                <strong>{loading ? '…' : loadError ? '—' : visibleBurials.length}</strong>
                <span>{loading ? 'loading records' : loadError ? 'records unavailable' : 'records shown'}</span>
              </div>
            </div>

            <div className="directory-card">
              <div className="directory-toolbar">
                <div className="search-field">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name..."
                    aria-label="Search burials by name"
                  />
                  {search && <button className="clear-button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
                </div>
                <label className="sort-control">
                  <span>Sort by</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort burials">
                    <option value="name-asc">Name (A–Z)</option>
                    <option value="name-desc">Name (Z–A)</option>
                    <option value="location">Location (mountain)</option>
                  </select>
                </label>
              </div>

              <div className="directory-info">
                <span className="info-icon">i</span>
                <p><strong>Burial locations use quadrant and lot numbers.</strong> These identify the assigned section and lot; they do not indicate an exact map coordinate.</p>
              </div>

              <div className="table-scroll">
                <table className="burial-table">
                  <thead>
                    <tr>
                      <th scope="col">NAME</th>
                      <th scope="col">YEARS</th>
                      <th scope="col">LOCATION INDICATOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr className="empty-row">
                        <td className="empty-state" colSpan="3">
                          <span className="loading-indicator" aria-hidden="true">◌</span>
                          <strong>Loading burial records</strong>
                          <small>Please wait while the directory loads.</small>
                        </td>
                      </tr>
                    ) : loadError ? (
                      <tr className="empty-row">
                        <td className="empty-state error-state" colSpan="3">
                          <span aria-hidden="true">!</span>
                          <strong>Could not load burial records</strong>
                          <small>{loadError}</small>
                          <button className="retry-button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
                        </td>
                      </tr>
                    ) : visibleBurials.map((burial) => (
                      <tr key={burial.id}>
                        <td>
                          <span className="person-avatar" aria-hidden="true">{burial.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                          <strong className="person-name">{burial.full_name}</strong>
                        </td>
                        <td className="years">{formatLifespan(burial.birth_date, burial.death_date)}</td>
                        <td>
                          <div className="location-indicator" title={`Quadrant ID: ${burial.quadrant_id}`}>
                            <span className="location-icon" aria-hidden="true">⌖</span>
                            <span><strong>Quadrant {burial.quadrant_id.slice(0, 8)}</strong><small>Lot {burial.lot_no}</small></span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && !loadError && !visibleBurials.length && (
                      <tr className="empty-row">
                        <td className="empty-state" colSpan="3">
                          <span>⌕</span>
                          <strong>No burials found</strong>
                          <small>Try a different name.</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                {loading ? 'Loading burial records…' : loadError ? 'Burial records could not be loaded.' : (
                  <>Showing <strong>{visibleBurials.length}</strong> of <strong>{burials.length}</strong> burial records</>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>© 2026 Panabo Memorial</span>
        <span>Made with care for families remembering loved ones.</span>
      </footer>
    </div>
  )
}

export default App
