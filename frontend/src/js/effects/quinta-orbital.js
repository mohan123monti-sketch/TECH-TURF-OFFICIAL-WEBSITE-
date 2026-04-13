/**
 * QUINTA ORBITAL - 3D Aerospace Engine v1.0
 * Division: Tech Turf Aerospace
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('quinta-branding')) return;

    const container = document.getElementById('three-container');
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x22d3ee, 2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // --- Orbital Objects ---
    const orbitalGroup = new THREE.Group();
    scene.add(orbitalGroup);

    // Create a central "Core" (Subtle)
    const coreGeo = new THREE.IcosahedronGeometry(2, 0);
    const coreMat = new THREE.MeshPhongMaterial({
        color: 0x0f172a,
        wireframe: true,
        transparent: true,
        opacity: 0.1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    orbitalGroup.add(core);

    // Create "Satellites" / Data Nodes
    const nodes = [];
    const nodeCount = 12;
    for (let i = 0; i < nodeCount; i++) {
        const nodeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const nodeMat = new THREE.MeshPhongMaterial({ color: 0x22d3ee });
        const node = new THREE.Mesh(nodeGeo, nodeMat);

        // Random orbit
        const distance = 5 + Math.random() * 5;
        const angle = (i / nodeCount) * Math.PI * 2;
        node.position.x = Math.cos(angle) * distance;
        node.position.z = Math.sin(angle) * distance;
        node.position.y = (Math.random() - 0.5) * 4;

        node.userData = {
            distance: distance,
            speed: 0.002 + Math.random() * 0.005,
            angle: angle
        };

        nodes.push(node);
        orbitalGroup.add(node);
    }

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for (let i = 0; i < 2000; i++) {
        starPos.push((Math.random() - 0.5) * 100);
        starPos.push((Math.random() - 0.5) * 100);
        starPos.push((Math.random() - 0.5) * 100);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.5 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    camera.position.z = 15;

    // --- Cursor Tracking ---
    window.addEventListener('mousemove', (e) => {
        // Update spotlight position for CSS effects
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    // --- Animation ---
    const animate = () => {
        requestAnimationFrame(animate);

        core.rotation.y += 0.001;
        core.rotation.x += 0.0005;

        nodes.forEach(node => {
            node.userData.angle += node.userData.speed;
            node.position.x = Math.cos(node.userData.angle) * node.userData.distance;
            node.position.z = Math.sin(node.userData.angle) * node.userData.distance;
            node.rotation.x += 0.01;
            node.rotation.y += 0.01;
        });

        // Automatic Movement (Floating)
        const time = performance.now() * 0.001;
        orbitalGroup.rotation.y += 0.0005;
        orbitalGroup.position.x = Math.sin(time * 0.3) * 0.4;
        orbitalGroup.position.y = Math.cos(time * 0.2) * 0.3;

        renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
