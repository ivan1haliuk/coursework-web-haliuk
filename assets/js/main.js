console.log('Project started');
document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('main-header');
    const burgerBtn = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');

    window.addEventListener('scroll', () => {
        if (window.innerWidth > 768) {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        } else {
            header.classList.remove('scrolled');
        }
    });

    if (burgerBtn && navLinks) {
        burgerBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-btn');
        if(btn) {
            btn.addEventListener('click', () => {
                const paragraph = item.querySelector('.faq-item-paragraph');
                const icon = item.querySelector('.faq-icon');
                const isOpen = paragraph.style.display === 'block';

                document.querySelectorAll('.faq-item-paragraph').forEach(p => p.style.display = 'none');
                document.querySelectorAll('.faq-icon').forEach(i => i.src = 'assets/images/icons/Down.png');

                if (!isOpen) {
                    paragraph.style.display = 'block';
                    icon.src = 'assets/images/icons/Up.png';
                }
            });
        }
    });

    const modal = document.getElementById('contactModal');
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.querySelector('.close-btn');

    if (modal && openModalBtn && closeModalBtn) {
        openModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });

        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
});