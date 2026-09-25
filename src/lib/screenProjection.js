// Map a screenshot rectangle onto the four measured inner corners of a device.
// CSS uses a 1000 × 1000 source plane; the photograph supplies the bezel.
export function screenProjection(corners) {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]]
  const rows = square.flatMap(([u, v], i) => {
    const [x, y] = corners[i]
    return [[u, v, 1, 0, 0, 0, -x*u, -x*v, x], [0, 0, 0, u, v, 1, -y*u, -y*v, y]]
  })
  for (let col = 0; col < 8; col++) {
    let pivot = col
    for (let r = col + 1; r < 8; r++) if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r
    ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
    const divisor = rows[col][col]
    if (Math.abs(divisor) < 1e-10) throw new Error('Degenerate screen corners')
    rows[col] = rows[col].map(value => value / divisor)
    for (let r = 0; r < 8; r++) {
      if (r === col) continue
      const factor = rows[r][col]
      rows[r] = rows[r].map((value, c) => value - factor * rows[col][c])
    }
  }
  const [a,b,c,d,e,f,g,h] = rows.map(row => row[8])
  return [a/1000,d/1000,0,g/1000,b/1000,e/1000,0,h/1000,0,0,1,0,c,f,0,1]
}
