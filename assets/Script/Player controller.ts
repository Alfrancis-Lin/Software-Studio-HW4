const {ccclass, property} = cc._decorator;

@ccclass
export default class Helloworld extends cc.Component {

    @property(cc.Label)
    label: cc.Label | null = null;


    @property
    text: string = 'hello';

    start () {
        // init logic
        if (this.label) {
            this.label.string = this.text;
        } else {
            cc.warn('Player controller: label is not assigned in Inspector');
        }
    }
}
