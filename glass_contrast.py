def lin(c):
    c/=255
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(rgb): r,g,b=rgb; return .2126*lin(r)+.7152*lin(g)+.0722*lin(b)
def cr(a,b):
    la,lb=L(a),L(b); 
    if la<lb: la,lb=lb,la
    return (la+.05)/(lb+.05)
def mix(fg,bg,a): return tuple(fg[i]*a+bg[i]*(1-a) for i in range(3))
def check(theme, glass, text, textsec, bright, a_fn):
    print(theme)
    for lg in (0,.55,1):
        a=a_fn(lg)
        for B in (.25,.5,.75,1.0):   # blurred backdrop gray level (0..1)
            bd=min(1,B*bright)*255
            comp=mix(glass,(bd,bd,bd),a)
            t=mix(text[0],comp,text[1]); ts=mix(textsec[0],comp,textsec[1])
            print(f" lg={lg:<4} a={a:.2f} B={B:<4} primary={cr(t,comp):5.1f} secondary={cr(ts,comp):5.1f}")
# Nilai akhir smart-glass.css (alpha = lantai + lg*rentang; bright = brightness() backdrop-filter)
check('DARK nav',    (22,23,26),   ((255,255,255),.94), ((235,235,245),.62), .74, lambda lg:.46+lg*.24)
check('DARK float',  (22,23,26),   ((255,255,255),.94), ((235,235,245),.62), .78, lambda lg:.54+lg*.26)
check('LIGHT nav',   (255,254,250),((0,0,0),.90),       ((0,0,0),.62),       1.08,lambda lg:.52+lg*.26)
check('LIGHT float', (255,254,250),((0,0,0),.90),       ((0,0,0),.62),       1.06,lambda lg:.64+lg*.24)
