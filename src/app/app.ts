import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SafeUrlPipe } from './pipes/safe-url.pipe';
import { ForbiddenModal} from './components/forbidden-modal/forbidden-modal';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,SafeUrlPipe,ForbiddenModal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
