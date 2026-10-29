  useEffect(() => {
    const timer = window.setInterval(() => {
      setGameMinutes((minutes) => {
        const GAME_DAY_MINUTES = 24 * 60
        const next = minutes + 8
        return ((next % GAME_DAY_MINUTES) + GAME_DAY_MINUTES) % GAME_DAY_MINUTES
      })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  const dayPhase = useMemo(() => {
    const hour = (gameMinutes / 60) % 24
    return hour >= 5.5 && hour < 19 ? 'day' : hour >= 19 || hour < 5.5 ? 'night' : 'dawn'
  }, [gameMinutes])
