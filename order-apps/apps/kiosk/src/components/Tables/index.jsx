import React from 'react'
import styles from './index.module.scss'

const Index = ({
    tables = [],
    setSteps,
    steps,
    request = []
}) => {

    const handleSetTable = (table) => {
        if (steps.table === table.id) {
            setSteps({
                ...steps,
                table: null
            })
        } else {
            setSteps({
                ...steps,
                table: table.id
            })
        }
    }

    return (
        <div className={styles.wrapper}>

            <div className={styles.menuTitle}>
                <span>Выберите стол</span>
            </div>

            <div className={styles.tables}>
            <div onClick={() => handleSetTable({id: 99})}
            className={`${styles.number_99}  ${steps.table == 99 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 1})}
            className={`${styles.number_1}  ${steps.table == 1 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 2})}
            className={`${styles.number_2}  ${steps.table == 2 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 3})}
            className={`${styles.number_3}  ${steps.table == 3 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 4})}
            className={`${styles.number_4}  ${steps.table == 4 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 5})}
            className={`${styles.number_5}  ${steps.table == 5 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 6})}
            className={`${styles.number_6}  ${steps.table == 6 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 7})}
            className={`${styles.number_7}  ${steps.table == 7 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 8})}
            className={`${styles.number_8}  ${steps.table == 8 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 9})}
            className={`${styles.number_9}  ${steps.table == 9 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 10})}
            className={`${styles.number_10}  ${steps.table == 10 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 11})}
            className={`${styles.number_11}  ${steps.table == 11 ? styles.active : ''}`}></div>
            <div onClick={() => handleSetTable({id: 12})}
            className={`${styles.number_12}  ${steps.table == 12 ? styles.active : ''}`}></div>
            </div>
        </div>
    )
}

export default Index
