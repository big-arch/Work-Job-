import * as THREE from './vendor/three/three.module.min.js'

const rad = Math.PI / 180
function surface(lon, lat) {
  return new THREE.Vector3(Math.cos(lat*rad)*Math.cos(lon*rad), Math.sin(lat*rad), -Math.cos(lat*rad)*Math.sin(lon*rad))
}
function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = path
  })
}

export async function mountGlobe(host, onCountry, signal) {
  const [geo, earth, ids] = await Promise.all([
    fetch(new URL('./atlas-geo.json', import.meta.url).href, {signal}).then(response => response.json()),
    loadImage(new URL('./atlas-earth.webp', import.meta.url).href), loadImage(new URL('./atlas-country-id.png', import.meta.url).href),
  ])
  if (signal.aborted) return
  const lookup = document.createElement('canvas')
  lookup.width = ids.width
  lookup.height = ids.height
  const ctx = lookup.getContext('2d', {willReadFrequently:true})
  ctx.drawImage(ids,0,0)
  const pixels = ctx.getImageData(0,0,ids.width,ids.height).data
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'})
  renderer.setClearColor(0,0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const canvas = renderer.domElement
  canvas.setAttribute('aria-hidden','true')
  host.append(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1.17,1.17,1.1,-1.1,.1,10)
  const texture = new THREE.Texture(earth)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({map:texture,roughness:1}))
  scene.add(sphere, new THREE.AmbientLight(0xe5ffff,1.55))
  const sun = new THREE.DirectionalLight(0xf2ffe2,2.15)
  scene.add(sun)
  const ray = new THREE.Raycaster()
  const pins = new Map()
  let lon=30,lat=31,width=1,height=1,frame=0,start=null
  function draw() {
    frame=0
    camera.position.copy(surface(lon,lat).multiplyScalar(3.2))
    camera.lookAt(0,0,0)
    camera.updateMatrixWorld()
    sun.position.copy(surface(lon-47,lat+23).multiplyScalar(4))
    renderer.render(scene,camera)
    for (const {node,point} of pins.values()) {
      const facing=point.dot(camera.position)/3.2
      node.hidden=facing<.32
      const view=point.clone().project(camera)
      node.style.left=((view.x+1)*50)+'%'
      node.style.top=((1-view.y)*50)+'%'
    }
    host.dataset.rendered='true'
  }
  function invalidate() { if (!frame) frame=requestAnimationFrame(draw) }
  function resize() {
    width=host.clientWidth; height=host.clientHeight
    if (!width || !height) return
    const half=Math.max(1.07,1.08*height/width)
    camera.left=-half*width/height; camera.right=-camera.left; camera.top=half; camera.bottom=-half
    camera.updateProjectionMatrix()
    renderer.setSize(width,height,false)
    invalidate()
  }
  function picking(event) {
    const box=canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2), camera)
    const uv=ray.intersectObject(sphere)[0]?.uv
    if (!uv) return
    const x=Math.min(ids.width-1,Math.floor(uv.x*ids.width))
    const y=Math.min(ids.height-1,Math.floor((1-uv.y)*ids.height))
    const code=geo.codes[pixels[(y*ids.width+x)*4]]
    if(code) onCountry(code)
  }
  canvas.onpointerdown=e=>{if(!e.isPrimary)return; start={x:e.clientX,y:e.clientY,lon,lat,moved:false}; canvas.setPointerCapture(e.pointerId)}
  canvas.onpointermove=e=>{
    if(!start||!e.isPrimary)return
    const dx=e.clientX-start.x,dy=e.clientY-start.y
    if(Math.hypot(dx,dy)>4)start.moved=true
    if(start.moved){lon=start.lon-dx*.38;lat=Math.max(-78,Math.min(78,start.lat+dy*.36));invalidate()}
  }
  canvas.onpointerup=e=>{if(start&&!start.moved)picking(e);start=null}
  canvas.onpointercancel=()=>{start=null}
  const observer=new ResizeObserver(resize)
  observer.observe(host)
  resize()
  function update(rows) {
    for(const pin of pins.values())pin.node.remove()
    pins.clear()
    const visible=rows.filter(item=>geo.centers[item.code]&&item.count>0).slice(0,24)
    for(const item of visible) {
      const node=document.createElement('button')
      node.type='button';node.className='map-pin'
      node.title=item.name+' · '+item.count
      node.setAttribute('aria-label',node.title)
      node.onclick=()=>onCountry(item.code)
      if(['IN','RU','US','AU'].includes(item.code)){
        const label=document.createElement('span');label.textContent=item.name;node.append(label)
      }
      host.append(node)
      pins.set(item.code,{node,point:surface(...geo.centers[item.code])})
    }
    invalidate()
  }
  function dispose(){
    observer.disconnect();cancelAnimationFrame(frame)
    for(const pin of pins.values())pin.node.remove()
    texture.dispose();sphere.material.dispose();sphere.geometry.dispose();renderer.dispose();renderer.forceContextLoss()
    canvas.remove();delete host.dataset.rendered
  }
  signal.addEventListener('abort',dispose,{once:true})
  return {update, turn:step=>{lon+=step;invalidate()}, center:code=>{const xy=geo.centers[code];if(xy){[lon,lat]=xy;invalidate()}}}
}
