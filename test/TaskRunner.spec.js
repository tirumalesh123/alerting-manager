import { expect } from 'chai'
import TaskRunner from '../src/TaskRunner'

describe('Task Runner utility', () => {

    it('should create an instance of TaskRunner and execute TestTask', (done) => {
        
        class TestTask extends TaskRunner.Task {
            run() {
                return 'test_output'
            }
        }
        
        let runner = new TaskRunner()

        runner.add('test', new TestTask()).schedule('test', '* * * * *')
        runner.onTick.addOnce(taskResult => {
            expect(taskResult.taskName).to.be.equal('test')
            expect(taskResult.output).to.be.equal('test_output')
            runner.stop('test').remove('test')
            done()
        })
        runner.invoke('test')
    })

})