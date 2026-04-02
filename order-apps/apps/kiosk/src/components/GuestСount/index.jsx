import React from 'react'
import styles from './index.module.scss'
import Continue from '../Continue'
import { FaMinus, FaPlus } from 'react-icons/fa'

const Index = ({steps, setSteps}) => {

    const handleCountMinus = () => {
        if (steps.guestСount > 1) {
            setSteps({...steps, guestСount: steps.guestСount - 1})
        }
    }

    const handleCountPlus = () => {
        setSteps({...steps, guestСount: steps.guestСount + 1})
    }
    

    return (
        <div className={styles.wrapper}>
            <div className={styles.menuTitle}>Выберите количество персон
                <Continue steps={steps} setSteps={setSteps}/>
            </div>

            <div className={styles.count_wrapper}>
                <span
                    onClick={() => handleCountMinus()}
                    className={styles.count_minus}><FaMinus/></span>
                <span className={styles.count}>{steps.guestСount}</span>
                <span
                    onClick={() => handleCountPlus()}
                    className={styles.count_plus}><FaPlus/></span>
            </div>
        </div>
    )
}

export default Index