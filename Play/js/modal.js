// Coming soon modal
function showComingSoon(e) {
    e.preventDefault();
    document.getElementById('modal').classList.add('active');
}
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});
