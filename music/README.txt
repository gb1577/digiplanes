Each plane plays music in this order:

1. Your own track, if present: music/<plane id>.mp3 (loops during the plane)
     01 cobalt.mp3     02 clay.mp3      03 noir.mp3      04 spectrum.mp3   05 milk.mp3
     06 amber.mp3      07 cocoa.mp3     08 prism.mp3     09 bubblegum.mp3  10 neon.mp3
     11 dune.mp3       12 ember.mp3     13 jade.mp3      14 ultra.mp3      15 paradox.mp3

2. Otherwise its Glass FM song: music/fm/<plane id>.js, played live on the FM synth
   (synth/engine.js). These were composed in the style of electro-synth-age/ (the SY22 tracks).
   Audition or tweak them on the synth page (synth/index.html, Songs panel).
   After editing a song, check it with:  node music/fm/check.js
