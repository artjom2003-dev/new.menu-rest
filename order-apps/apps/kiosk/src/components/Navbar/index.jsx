import React from 'react'
import styles from './index.module.scss'
import Logo from '../../assets/img/logo.png'

const Index = ({ hidden }) => {
    return (
        <div className={`${styles.navbar} ${hidden ? styles.navbarHidden : ''}`}>
            <img src={Logo} className={styles.logo} alt='Логотип'/>
            <div className={styles.info}>
                <span className={styles.infoTitle}>Бизнес-ланч</span>
                <span className={styles.time}>12:00 — 15:00</span>
            </div>
        </div>
    )
}

export default Index
