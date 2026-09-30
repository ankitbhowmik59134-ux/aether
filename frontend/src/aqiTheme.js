export function categoryColor(category) {
  switch (category) {
    case 'Good':
      return '#2dd4bf'
    case 'Satisfactory':
      return '#5eead4'
    case 'Moderate':
      return '#fbbf24'
    case 'Poor':
      return '#f59e0b'
    case 'Very Poor':
      return '#ea580c'
    case 'Severe':
      return '#dc2626'
    default:
      return '#8b9aab'
  }
}

export function trendLabel(dir) {
  if (dir === 'up') return 'Worsening'
  if (dir === 'down') return 'Improving'
  return 'Stable'
}
