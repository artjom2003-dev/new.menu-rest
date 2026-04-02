import React, { useEffect, useState, useRef, useCallback } from 'react'
import styles from './index.module.css'
import { FaMinus, FaPlus } from 'react-icons/fa'
import { PiBowlFoodLight } from 'react-icons/pi'
import LogoEmblem from '../../assets/img/logo-emblem.png'
import { useTouchScrollOnRef } from '../../hooks/useTouchScroll'

const STATIC_SLIDES = [
    { title: 'Освежающие напитки', subtitle: 'Коктейли, чай, кофе, лимонады', theme: 'slideOcean', target: 'Напитки' },
    { title: 'Свежая выпечка', subtitle: 'Десерты, торты, круассаны', theme: 'slideChocolate', target: 'Десерты' },
];

const Index = ({fullMenu, request = [], handleGetRequest, steps, setSteps, isActive, onOpenBL, blData, onOpenDetail}) => {
    const [data, setData] = useState([])
    const [activeCategory, setActiveCategory] = useState(null)
    const sectionRefs = useRef({})
    const listRef = useRef(null)
    const scrollTimeout = useRef(null)
    const isUserScrolling = useRef(true)
    const categoryNavRef = useRef(null)
    useTouchScrollOnRef(listRef, { direction: 'vertical' })
    useTouchScrollOnRef(categoryNavRef, { direction: 'vertical' })
    const slideTimer = useRef(null)
    const snapFallback = useRef(null)

    const hasBL = blData && blData.length > 0;

    // Build BL tab names — each BL is a separate tab
    const blTabs = hasBL ? blData.map((bl, idx) => ({
        title: bl.title || `Бизнес-ланч ${blData.length > 1 ? idx + 1 : ''}`.trim(),
        bid: bl.bid,
        categories: bl.categories || [],
    })) : [];

    const SLIDES = [
        { title: 'Бизнес-ланч', subtitle: 'с 12:00 до 15:00', theme: 'slideCurtain', target: 'Бизнес-ланч' },
        ...STATIC_SLIDES,
    ];

    // — Looping slider logic —
    // Extended track: [clone-last, slide0, slide1, slide2, clone-first]
    const extSlides = SLIDES.length > 0 ? [SLIDES[SLIDES.length - 1], ...SLIDES, SLIDES[0]] : [];
    const SLIDE_W = 75;
    const EXT_COUNT = extSlides.length;
    const TRACK_W = EXT_COUNT * SLIDE_W;
    const CENTER = (100 - SLIDE_W) / 2;

    const [extIdx, setExtIdx] = useState(1); // 1 = first real slide
    const [noTransition, setNoTransition] = useState(false);

    // Real index for dots (0..SLIDES.length-1)
    const realIdx = extIdx <= 0 ? SLIDES.length - 1
        : extIdx > SLIDES.length ? 0
        : extIdx - 1;

    const getTrackTransform = (idx) => {
        const wrapperOff = CENTER - idx * SLIDE_W;
        const trackOff = (wrapperOff / TRACK_W) * 100;
        return `translateX(${trackOff}%)`;
    };

    // After animating to a clone, snap to real position without transition
    const handleTransitionEnd = useCallback(() => {
        if (extIdx === 0) {
            clearTimeout(snapFallback.current);
            setNoTransition(true);
            setExtIdx(SLIDES.length);
        } else if (extIdx === EXT_COUNT - 1) {
            clearTimeout(snapFallback.current);
            setNoTransition(true);
            setExtIdx(1);
        }
    }, [extIdx, EXT_COUNT]);

    // Fallback: if transitionEnd doesn't fire (GPU recomposition from Timer overlay etc.), force snap
    useEffect(() => {
        if (extIdx === 0 || extIdx === EXT_COUNT - 1) {
            snapFallback.current = setTimeout(() => {
                setNoTransition(true);
                setExtIdx(extIdx === 0 ? SLIDES.length : 1);
            }, 600); // slightly longer than the 0.5s CSS transition
            return () => clearTimeout(snapFallback.current);
        }
    }, [extIdx, EXT_COUNT]);

    // Re-enable transition after snap
    useEffect(() => {
        if (noTransition) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setNoTransition(false));
            });
        }
    }, [noTransition]);

    const resetSlideTimer = useCallback(() => {
        clearInterval(slideTimer.current);
        slideTimer.current = setInterval(() => {
            setExtIdx(prev => {
                // Safety: if index escaped valid range, reset to first real slide
                if (prev < 0 || prev >= EXT_COUNT) return 1;
                return prev + 1;
            });
        }, 30000);
    }, []);

    useEffect(() => {
        resetSlideTimer();
        return () => {
            clearInterval(slideTimer.current);
            clearTimeout(snapFallback.current);
        };
    }, [resetSlideTimer]);

    const goPrev = useCallback(() => {
        setExtIdx(prev => prev - 1);
        resetSlideTimer();
    }, [resetSlideTimer]);

    const goNext = useCallback(() => {
        setExtIdx(prev => prev + 1);
        resetSlideTimer();
    }, [resetSlideTimer]);

    const goToSlide = useCallback((realI) => {
        setExtIdx(realI + 1);
        resetSlideTimer();
    }, [resetSlideTimer]);

    function groupBySectionTitleToArrays(items) {
        const grouped = items.reduce((result, item) => {
            const sectionTitle = item?.section_title;
            if (!result[sectionTitle]) {
                result[sectionTitle] = [];
            }
            result[sectionTitle].push(item);
            return result;
        }, {});
        return Object.values(grouped);
    }

    useEffect(() => {
        if (fullMenu && fullMenu.length > 0) {
            const groupedItems = groupBySectionTitleToArrays(fullMenu);
            // Dynamic ordering: use section_id for stable sort, no hardcoded names
            const sortGroupedItems = groupedItems
                .filter(Boolean)
                .sort((a, b) => {
                    const idA = a[0]?.section_id || 0;
                    const idB = b[0]?.section_id || 0;
                    return idA - idB;
                });
            setData(sortGroupedItems);
        }
    }, [fullMenu])

    const getItemCount = (id) => request.filter(item => item.id === id).length;

    const categories = data.map(el => el?.[0]?.section_title).filter(Boolean);
    if (hasBL) categories.unshift('Бизнес-ланч');

    // Auto-scroll active chip into view (works for both vertical and horizontal nav)
    useEffect(() => {
        if (activeCategory && categoryNavRef.current) {
            const nav = categoryNavRef.current;
            const activeChip = nav.querySelector('[data-active="true"]');
            if (activeChip) {
                const navRect = nav.getBoundingClientRect();
                const chipRect = activeChip.getBoundingClientRect();
                const outOfView =
                    chipRect.top < navRect.top ||
                    chipRect.bottom > navRect.bottom ||
                    chipRect.left < navRect.left ||
                    chipRect.right > navRect.right;
                if (outOfView) {
                    activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
            }
        }
    }, [activeCategory]);

    const scrollToSection = (title) => {
        const el = sectionRefs.current[title];
        if (el && listRef.current) {
            isUserScrolling.current = false;
            setActiveCategory(title);
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Re-enable scroll tracking after animation
            clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                isUserScrolling.current = true;
            }, 800);
        }
    };

    const handleScroll = useCallback(() => {
        if (!listRef.current) return;
        const container = listRef.current;
        const scrollTop = container.scrollTop;

        // Track active category on user scroll
        if (isUserScrolling.current) {
            let current = null;
            for (const title of categories) {
                const el = sectionRefs.current[title];
                if (el) {
                    const elTop = el.offsetTop - container.offsetTop;
                    if (elTop <= scrollTop + 120) {
                        current = title;
                    }
                }
            }
            if (current && current !== activeCategory) {
                setActiveCategory(current);
            }
        }
    }, [categories, activeCategory]);

    useEffect(() => {
        const list = listRef.current;
        if (list) {
            list.addEventListener('scroll', handleScroll, { passive: true });
            return () => list.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0]);
        }
    }, [categories, activeCategory]);

    return (
        <>
    <div className={styles.bg}>
        <div className={styles.wrapper}>
            {/* Category navigation bar */}
            <div
                className={styles.categoryNav}
                ref={categoryNavRef}
            >
                {categories.map(title => (
                    <div
                        key={title}
                        data-active={activeCategory === title ? 'true' : 'false'}
                        className={`${styles.categoryChip} ${activeCategory === title ? styles.categoryChipActive : ''}`}
                        onClick={() => scrollToSection(title)}
                    >
                        {title}
                    </div>
                ))}
            </div>

            <div className={styles.list} ref={listRef}>
            {/* Banner slider (looping) */}
            <div className={styles.sliderSection}>
                <div className={styles.sliderArrow} onClick={goPrev}>&#8249;</div>
                <div className={styles.sliderWrap}>
                    <div
                        className={styles.sliderTrack}
                        style={{
                            width: `${TRACK_W}%`,
                            transform: getTrackTransform(extIdx),
                            transition: noTransition ? 'none' : undefined
                        }}
                        onTransitionEnd={handleTransitionEnd}
                    >
                        {extSlides.map((slide, i) => (
                            <div
                                key={i}
                                className={`${styles.slide} ${styles[slide.theme]} ${i === extIdx ? styles.slideActive : ''}`}
                                style={{ width: `${(SLIDE_W / TRACK_W) * 100}%` }}
                                onClick={() => scrollToSection(slide.target)}
                            >
                                <img src={LogoEmblem} className={styles.bannerLogo} alt="Кафе Манго" />
                                <div className={styles.bannerText}>
                                    <span className={styles.bannerTitle}>{slide.title}</span>
                                    <span className={styles.bannerTime}>{slide.subtitle}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.sliderArrow} onClick={goNext}>&#8250;</div>
            </div>
            <div className={styles.sliderDots}>
                {SLIDES.map((_, i) => (
                    <div
                        key={i}
                        className={`${styles.sliderDot} ${i === realIdx ? styles.sliderDotActive : ''}`}
                        onClick={() => goToSlide(i)}
                    />
                ))}
            </div>

            {/* BL cards — one card per business lunch, each opens its own modal */}
            {hasBL && (
                <div className={styles.container} ref={el => sectionRefs.current['Бизнес-ланч'] = el}>
                    <div className={styles.section_title}>Бизнес-ланч</div>
                    <div className={styles.itemBlock}>
                        {blData.map((bl, idx) => {
                            const blImage = bl.image?.[0]?.Url;
                            const blPrice = bl.price ? `${parseFloat(bl.price).toFixed(0)}` : '';
                            return (
                            <div className={styles.blCard} key={bl.bid || idx} onClick={() => onOpenBL(idx)}
                                style={blImage ? { backgroundImage: `url(${blImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                                <div className={styles.blCardOverlay}>
                                    {!blImage && <div className={styles.blCardIcon}><PiBowlFoodLight /></div>}
                                    <div className={styles.blCardTitle}>{bl.title_ru || bl.title || `Бизнес-ланч`}</div>
                                    {blPrice && <div className={styles.blCardPrice}>{blPrice} &#8381;</div>}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {
                data?.map((el, i) =>
                    <div className={styles.container} key={i} ref={el_ => sectionRefs.current[el?.[0]?.section_title] = el_}>
                    <div className={styles.section_title}>{el?.[0]?.section_title}</div>
                    <div className={styles.itemBlock}>
                        {
                            el?.map(_el => {
                                const count = getItemCount(_el?.id);
                                return (
                                <div className={styles.item} key={_el?.id}>
                                    <div
                                        className={styles.itemImage}
                                        style={{
                                            backgroundImage: `url(${_el?.image?.[0]?.Url})`
                                        }}
                                        onClick={() => onOpenDetail?.(_el)}
                                    >
                                        <div className={styles.item_inner}>
                                            <div className={styles.itemAbout}>
                                                <div className={styles.title}>{_el?.title_ru}</div>
                                                <div className={styles.composition}>{_el?.composition}</div>
                                            </div>
                                            <div className={styles.itemPrice}>{(_el?.price || '0').slice(0, -3)} &#8381;</div>
                                        </div>
                                    </div>
                                    <div className={styles.itemButtons}>
                                        <span
                                            onClick={() => count > 0 && handleGetRequest?.(_el, 'remove')}
                                            className={`${styles.count_minus} ${count === 0 ? styles.count_disabled : ''}`}
                                        ><FaMinus/></span>
                                        <span className={styles.count}>{count}</span>
                                        <span
                                            onClick={() => handleGetRequest?.(_el, 'add')}
                                            className={styles.count_plus}
                                        ><FaPlus/></span>
                                    </div>
                                </div>
                                )
                            })
                        }
                    </div>
                    </div>
                )
            }
            </div>
        </div>
    </div>

    </>
  )
}

export default Index
