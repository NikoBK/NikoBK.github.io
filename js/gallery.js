const galleryData = [
{
    title: "Underwater Image Enhancing",
    desc: "Check out this project I did where my team and I took our first dive into enhancing colors and details on underwater image pictures using OpenCV in Python. Find it on the blog or port folio!",
    img: "https://raw.githubusercontent.com/NikoBK/NikoBK.github.io/refs/heads/master/images/thumbs/imgenhance.webp"
},
{
    title: "Autonomous Drone Protocol",
    desc: "A project where my team and I utilized ImGui and TCP knowledge in C++ to build our own protocol for communicating with a fully autonomous drone we worked on. Check it out on my blog or portfolio!",
    img: "https://raw.githubusercontent.com/NikoBK/NikoBK.github.io/refs/heads/master/images/thumbs/drone.webp"
},
{
    title: "Planar Mover Technology",
    desc: "I am currently working on this project. I am using C# to write a control surface for an ACOPOS 6D along with a simulated manufacturing execution system to show use cases for it. Find it on the blog soon!",
    img: "https://raw.githubusercontent.com/NikoBK/NikoBK.github.io/refs/heads/master/images/thumbs/acopos.webp"
}];

let currentIndex = 0;

// Elements
const titleEl = document.getElementById("galleryTitle");
const descEl = document.getElementById("galleryDesc");
const imageEl = document.getElementById("galleryImage");
const dots = document.querySelectorAll(".gallery-dot");

// Update content
function updateGallery(index) {
    const item = galleryData[index];

    titleEl.textContent = item.title;
    descEl.textContent = item.desc;
    imageEl.src = item.img;

    dots.forEach(dot => dot.classList.remove("active"));
    dots[index].classList.add("active");
}

// Buttons
document.getElementById("galleryPrev").addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
    updateGallery(currentIndex);
});

document.getElementById("galleryNext").addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % galleryData.length;
    updateGallery(currentIndex);
});

// Dot click behavior
dots.forEach(dot => {
    dot.addEventListener("click", () => {
        currentIndex = Number(dot.dataset.index);
        updateGallery(currentIndex);
    });
});
