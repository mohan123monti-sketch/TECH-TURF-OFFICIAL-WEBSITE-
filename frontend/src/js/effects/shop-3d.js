/**
 * Tech Turf Shop 3D Engine - THIRD CHOICE: DEPTH LAYER PANEL
 * Premium Neutral Aesthetic for Marketplace v5.0
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('shop-branding')) return;

    // --- HERO 3D (Depth Panels) ---
    initDepthPanels('three-container-shop', 600);

    // --- DIVIDER 3D (Subtle Subtle Layer) ---
    initDepthPanels('three-divider-1', 120, true);
});

function initDepthPanels(containerId, height, isMinimal = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / height, 0.1, 1000);
    camera.position.z = 25;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Enable shadows for depth feel
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // --- LIGHTING (Soft Neutral) ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(0, 20, 10);
    spotLight.castShadow = true;
    scene.add(spotLight);

    // --- DEPTH PANELS ---
    const count = isMinimal ? 2 : 6;
    const panelColors = [0xFFFFFF, 0x1E293B, 0x0F172A]; // Dark mode depth palette

    for (let i = 0; i < count; i++) {
        const width = 10 + Math.random() * 20;
        const heightPanel = 8 + Math.random() * 15;
        const geo = new THREE.PlaneGeometry(width, heightPanel);
        const mat = new THREE.MeshPhongMaterial({
            color: panelColors[i % 3],
            transparent: true,
            opacity: isMinimal ? 0.05 : 0.15,
            side: THREE.DoubleSide
        });

        const panel = new THREE.Mesh(geo, mat);

        // Random placement in depth zones
        panel.position.x = (Math.random() - 0.5) * 40;
        panel.position.y = (Math.random() - 0.5) * 20;
        panel.position.z = -i * 5; // Layered depth

        panel.rotation.x = Math.random() * 0.5 - 0.25;
        panel.rotation.y = Math.random() * 0.5 - 0.25;
        panel.rotation.z = Math.random() * 0.2 - 0.1;

        panel.receiveShadow = true;
        panel.castShadow = true;

        // Animation Data
        panel.userData = {
            baseY: panel.position.y,
            speed: 0.0005 + Math.random() * 0.001,
            offset: Math.random() * Math.PI * 2
        };

        group.add(panel);
    }

    // --- MOUSE INTERACTION ---
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) / 100;
        mouseY = (e.clientY - window.innerHeight / 2) / 100;
    });

    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now() * 0.001;

        // Animate Float
        group.children.forEach(panel => {
            const data = panel.userData;
            if (data) {
                panel.position.y = data.baseY + Math.sin(time * 0.5 + data.offset) * 1.5;
                panel.rotation.y += 0.0005;
            }
        });

        // Smooth Autonomous Floating (Replaced Mouse Parallax)
        group.rotation.x = Math.sin(time * 0.2) * 0.1;
        group.rotation.y = Math.cos(time * 0.3) * 0.1;

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / height;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, height);
    });
}
