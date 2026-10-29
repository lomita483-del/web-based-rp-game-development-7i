'use client'

import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

/** A flat text sign drawn on a canvas, used for building names, billboards and markers. */
export function WorldLabel({ text, width, accentColor }: { text: string; width: number; accentColor: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) return null

    context.fillStyle = 'rgba(16, 23, 30, 0.94)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = accentColor
    context.lineWidth = 4
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6)
    context.fillStyle = '#f2e8d7'
    context.font = '600 40px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 36)

    const labelTexture = new CanvasTexture(canvas)
    labelTexture.colorSpace = SRGBColorSpace
    return labelTexture
  }, [accentColor, text])

  if (!texture) return null

  return (
    <mesh>
      <planeGeometry args={[width, width / 4]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}
