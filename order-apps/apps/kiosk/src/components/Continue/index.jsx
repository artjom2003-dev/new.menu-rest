import React from 'react'
import styles from './index.module.scss'

const Index = ({steps, setSteps, request = []}) => {
    return (
        <div className={styles.wrapper}>
            {
                steps.isActive > 1 &&
                <div 
                    className={styles.tableName} 
                    style={{
                        position: steps.isActive > 1 ? 'relative' : 'absolute', 
                        left: steps.isActive > 1 ? 0 : 'auto',
                        right: steps.isActive > 1 ? 'auto' : 0
                    }}
                    onClick={() => setSteps({...steps, isActive: steps.isActive - 1})}>Назад</div>
            }
            {
                (steps.isActive >= 2 || request.length === 0) ? 
                <></> : <div
                className={styles.tableName}
                onClick={() => setSteps({
                ...steps,
                isActive: steps.isActive + 1
            })}>Продолжить</div>
            }
        </div>
    )
}

export default Index