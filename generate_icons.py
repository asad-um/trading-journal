#!/usr/bin/env python3
"""
Generate modern abstract app icons for WJournal PWA.
Design: "Ascending Precision" - Abstract W made of 3 ascending bars.
"""

from PIL import Image, ImageDraw
import math

def create_icon(size):
    """Create a modern abstract trading journal icon."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale factor based on size
    s = size / 512
    padding = int(64 * s)
    
    # Define colors - deep blue gradient palette
    color_dark = (30, 58, 138)      # Deep blue
    color_mid = (59, 130, 246)      # Bright blue  
    color_light = (147, 197, 253)   # Light blue
    color_accent = (34, 197, 94)    # Green (profit/win)
    
    # Background circle with subtle gradient effect
    cx, cy = size // 2, size // 2
    radius = (size - padding * 2) // 2
    
    # Draw background circle (dark navy)
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        fill=(15, 23, 42)
    )
    
    # Inner circle border glow
    draw.ellipse(
        [cx - radius + 4, cy - radius + 4, cx + radius - 4, cy + radius - 4],
        outline=color_mid, width=max(2, int(4 * s))
    )
    
    # Draw 3 ascending bars forming abstract W
    bar_width = int(48 * s)
    bar_gap = int(32 * s)
    base_y = cy + int(80 * s)
    
    # Bar 1 (left, ascending)
    bar1_h = int(120 * s)
    bar1_x = cx - bar_width - bar_gap - bar_width//2
    draw.rounded_rectangle(
        [bar1_x, base_y - bar1_h, bar1_x + bar_width, base_y],
        radius=int(12 * s),
        fill=color_light
    )
    
    # Bar 2 (middle, tallest)
    bar2_h = int(200 * s)
    bar2_x = cx - bar_width // 2
    draw.rounded_rectangle(
        [bar2_x, base_y - bar2_h, bar2_x + bar_width, base_y],
        radius=int(12 * s),
        fill=color_mid
    )
    
    # Bar 3 (right, ascending with green tip)
    bar3_h = int(160 * s)
    bar3_x = cx + bar_gap + bar_width//2
    draw.rounded_rectangle(
        [bar3_x, base_y - bar3_h, bar3_x + bar_width, base_y],
        radius=int(12 * s),
        fill=color_accent
    )
    
    # Add subtle "connection lines" to form W shape
    line_width = max(2, int(3 * s))
    
    # Left diagonal
    draw.line(
        [(bar1_x + bar_width, base_y - bar1_h), (bar2_x, base_y - bar2_h)],
        fill=color_mid, width=line_width
    )
    
    # Right diagonal  
    draw.line(
        [(bar2_x + bar_width, base_y - bar2_h), (bar3_x, base_y - bar3_h)],
        fill=color_mid, width=line_width
    )
    
    return img

# Generate icons at required sizes
if __name__ == "__main__":
    # Favicon (32x32)
    favicon = create_icon(32)
    favicon.save("public/favicon.ico", format='ICO')
    
    # PWA icon 192x192
    icon192 = create_icon(192)
    icon192.save("public/icon-192x192.png", format='PNG')
    
    # PWA icon 512x512
    icon512 = create_icon(512)
    icon512.save("public/icon-512x512.png", format='PNG')
    
    print("Icons generated successfully:")
    print("  - public/favicon.ico (32x32)")
    print("  - public/icon-192x192.png")
    print("  - public/icon-512x512.png")
